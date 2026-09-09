/**
 * server/src/services/healthService.js
 *
 * ONECOOLIE Phase 6.8: Centralized Health & Readiness Service
 *
 * Responsibilities:
 * - Liveness probe: Ultra-fast event loop & process health check without database hits.
 * - Readiness probe: Comprehensive dependency check with timeouts and short TTL caching.
 * - Server Draining awareness: Reports unhealthy when graceful shutdown is initiated.
 *
 * STRICT SECURITY: Zero credentials, tokens, DB URLs, or stack traces are ever exposed.
 */

const defaultSupabase = require('../config/db');
const { validateEnvironment, isProduction } = require('../config/environment');
const { checkDatabaseReadiness } = require('./databaseReadinessService');
const { logger } = require('../utils/logger');

// Short TTL cache for readiness checks to prevent database hammering (5 seconds)
let readinessCache = null;
let readinessCacheExpiresAt = 0;
const CACHE_TTL_MS = 5000;

// Application draining flag (controlled by gracefulShutdownService)
let appDraining = false;

/**
 * Marks application as draining (shutting down).
 * @param {boolean} draining
 */
function setDrainingState(draining) {
  appDraining = Boolean(draining);
  // Invalidate readiness cache immediately on state transition
  readinessCache = null;
  readinessCacheExpiresAt = 0;
}

/**
 * Checks whether the application is currently in draining state.
 * @returns {boolean}
 */
function isDraining() {
  return appDraining;
}

/**
 * Liveness Probe.
 * Fast, lightweight check verifying the Node.js process and event loop are responsive.
 * Never performs network or database calls.
 *
 * @returns {object}
 */
function getLiveness() {
  const mem = process.memoryUsage();

  return {
    status: appDraining ? 'draining' : 'ok',
    service: 'onecoolie-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024))
    }
  };
}

/**
 * Helper to execute an async promise with a strict timeout.
 * @param {Promise<any>} promise
 * @param {number} timeoutMs
 * @param {string} operationName
 * @returns {Promise<any>}
 */
async function withTimeout(promise, timeoutMs = 3000, operationName = 'Operation') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Readiness Probe.
 * Verifies all dependencies required to serve production traffic.
 *
 * Checks:
 * 1. Draining state (if draining, returns unhealthy)
 * 2. Environment configuration validation
 * 3. Database connectivity with 3000ms timeout
 * 4. Database required schema availability
 *
 * @param {object} [options]
 * @param {boolean} [options.bypassCache=false] - Ignore short TTL cache
 * @param {number} [options.timeoutMs=3000] - Dependency timeout in milliseconds
 * @param {object} [options.client=defaultSupabase] - Supabase client
 * @returns {Promise<object>} Structured readiness report
 */
async function getReadiness(options = {}) {
  const { bypassCache = false, timeoutMs = 3000, client = defaultSupabase } = options;
  const now = Date.now();

  // 1. Draining Check: Immediate rejection if shutting down
  if (appDraining) {
    return {
      status: 'unhealthy',
      draining: true,
      service: 'onecoolie-api',
      timestamp: new Date().toISOString(),
      message: 'Application is draining connections and shutting down.'
    };
  }

  // 2. Return cached readiness check if valid
  if (!bypassCache && readinessCache && now < readinessCacheExpiresAt) {
    return { ...readinessCache, cached: true };
  }

  const checks = {
    database: { status: 'healthy', latencyMs: 0 },
    schema: { status: 'healthy', tablesChecked: 0, missingTables: [] },
    environment: { status: 'healthy', mode: process.env.NODE_ENV || 'development' },
    securityInfrastructure: { status: 'healthy' }
  };

  let overallStatus = 'healthy';

  // Check 1: Environment Validation
  try {
    const envVal = validateEnvironment();
    if (!envVal.valid) {
      checks.environment.status = isProduction() ? 'unhealthy' : 'degraded';
      checks.environment.missing = envVal.missing;
      if (checks.environment.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }
  } catch (envErr) {
    checks.environment.status = 'unhealthy';
    overallStatus = 'unhealthy';
  }

  // Check 2: Database Connectivity & Latency (Strict Timeout)
  const dbStart = Date.now();
  try {
    await withTimeout(
      (async () => {
        const { error } = await client.from('users').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          throw new Error(error.message || 'Database query failed');
        }
      })(),
      timeoutMs,
      'Database ping'
    );
    checks.database.latencyMs = Date.now() - dbStart;
    if (checks.database.latencyMs > 1500) {
      checks.database.status = 'degraded';
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }
  } catch (dbErr) {
    checks.database.status = 'unhealthy';
    checks.database.latencyMs = Date.now() - dbStart;
    checks.database.error = 'Database connection unreachable or timed out';
    overallStatus = 'unhealthy';
    logger.warn('[HEALTH_SERVICE] Database readiness check failed:', dbErr.message);
  }

  // Check 3: Schema Readiness
  if (checks.database.status !== 'unhealthy') {
    try {
      const dbReadiness = await withTimeout(
        checkDatabaseReadiness(client),
        timeoutMs,
        'Schema readiness check'
      );
      checks.schema.tablesChecked = dbReadiness.tables_checked || 0;
      checks.schema.missingTables = dbReadiness.missing_tables || [];

      if (!dbReadiness.ready) {
        checks.schema.status = isProduction() ? 'unhealthy' : 'degraded';
        if (checks.schema.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }
    } catch (schemaErr) {
      checks.schema.status = 'degraded';
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }
  } else {
    checks.schema.status = 'unhealthy';
  }

  const report = {
    status: overallStatus,
    draining: false,
    service: 'onecoolie-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks
  };

  // Cache report only if healthy or degraded (transient failures retry with shorter TTL)
  if (overallStatus !== 'unhealthy') {
    readinessCache = report;
    readinessCacheExpiresAt = now + CACHE_TTL_MS;
  } else {
    readinessCache = null;
    readinessCacheExpiresAt = 0;
  }

  return report;
}

/**
 * Clears the readiness cache. Intended for testing or immediate diagnostic re-checks.
 */
function clearReadinessCache() {
  readinessCache = null;
  readinessCacheExpiresAt = 0;
}

module.exports = {
  getLiveness,
  getReadiness,
  setDrainingState,
  isDraining,
  clearReadinessCache
};

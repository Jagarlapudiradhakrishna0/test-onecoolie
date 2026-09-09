/**
 * server/src/services/metricsService.js
 *
 * ONECOOLIE Phase 6.8: In-Memory Application & Operational Metrics Service
 *
 * Lightweight, non-blocking metrics collection across:
 * - HTTP traffic (volume, methods, status breakdown, duration percentiles)
 * - Authentication & MFA events (success, failures, lockouts, refresh, token reuse)
 * - Session & Socket lifecycle (creation, revocation, active socket counts)
 * - Security incidents & containment actions
 *
 * STRICT PRIVACY: Zero PII, tokens, credentials, or raw IP addresses are ever recorded.
 */

const metrics = {
  startedAt: new Date().toISOString(),

  http: {
    totalRequests: 0,
    requestsByMethod: {},
    requestsByRoute: {},
    statusCategories: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0
    },
    errorCount4xx: 0,
    errorCount5xx: 0,
    durations: {
      count: 0,
      totalMs: 0,
      minMs: null,
      maxMs: 0,
      avgMs: 0
    }
  },

  auth: {
    loginSuccessCount: 0,
    loginFailureCount: 0,
    mfaSuccessCount: 0,
    mfaFailureCount: 0,
    accountLockoutCount: 0,
    tokenRefreshSuccessCount: 0,
    tokenRefreshFailureCount: 0,
    refreshTokenReuseCount: 0
  },

  session: {
    sessionsCreated: 0,
    sessionsRevoked: 0,
    logoutEvents: 0,
    logoutAllEvents: 0,
    activeSocketConnections: 0,
    socketDisconnectReasons: {}
  },

  security: {
    eventsBySeverity: {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    openIncidents: 0,
    criticalIncidents: 0,
    automatedContainmentActions: 0,
    manualContainmentActions: 0
  }
};

/**
 * Records an HTTP request transaction.
 *
 * @param {object} params
 * @param {string} params.method - HTTP Method
 * @param {string} params.route - Normalized route path (e.g. /api/bookings)
 * @param {number} params.statusCode - HTTP Response Status Code
 * @param {number} params.durationMs - Duration in milliseconds
 */
function recordHttpRequest({ method = 'GET', route = 'unknown', statusCode = 200, durationMs = 0 }) {
  const normMethod = (method || 'GET').toUpperCase();
  const cleanRoute = (route || 'unknown').split('?')[0];

  metrics.http.totalRequests++;
  metrics.http.requestsByMethod[normMethod] = (metrics.http.requestsByMethod[normMethod] || 0) + 1;
  metrics.http.requestsByRoute[cleanRoute] = (metrics.http.requestsByRoute[cleanRoute] || 0) + 1;

  // Status Category
  if (statusCode >= 200 && statusCode < 300) {
    metrics.http.statusCategories['2xx']++;
  } else if (statusCode >= 300 && statusCode < 400) {
    metrics.http.statusCategories['3xx']++;
  } else if (statusCode >= 400 && statusCode < 500) {
    metrics.http.statusCategories['4xx']++;
    metrics.http.errorCount4xx++;
  } else if (statusCode >= 500) {
    metrics.http.statusCategories['5xx']++;
    metrics.http.errorCount5xx++;
  }

  // Duration
  const d = Math.max(0, Number(durationMs) || 0);
  metrics.http.durations.count++;
  metrics.http.durations.totalMs += d;
  if (metrics.http.durations.minMs === null || d < metrics.http.durations.minMs) {
    metrics.http.durations.minMs = Math.round(d * 100) / 100;
  }
  if (d > metrics.http.durations.maxMs) {
    metrics.http.durations.maxMs = Math.round(d * 100) / 100;
  }
  metrics.http.durations.avgMs =
    Math.round((metrics.http.durations.totalMs / metrics.http.durations.count) * 100) / 100;
}

/**
 * Increments an authentication metric.
 * @param {keyof typeof metrics.auth} metricKey
 * @param {number} count
 */
function recordAuthMetric(metricKey, count = 1) {
  if (metrics.auth[metricKey] !== undefined) {
    metrics.auth[metricKey] += count;
  }
}

/**
 * Increments a session metric.
 * @param {string} metricKey
 * @param {number} count
 */
function recordSessionMetric(metricKey, count = 1) {
  if (metrics.session[metricKey] !== undefined && typeof metrics.session[metricKey] === 'number') {
    metrics.session[metricKey] += count;
  }
}

/**
 * Records Socket.IO connection and disconnect telemetry.
 * @param {number} activeSockets
 * @param {string} [disconnectReason]
 */
function recordSocketActivity(activeSockets, disconnectReason = null) {
  if (typeof activeSockets === 'number') {
    metrics.session.activeSocketConnections = Math.max(0, activeSockets);
  }
  if (disconnectReason) {
    const reasonKey = String(disconnectReason).slice(0, 50);
    metrics.session.socketDisconnectReasons[reasonKey] =
      (metrics.session.socketDisconnectReasons[reasonKey] || 0) + 1;
  }
}

/**
 * Records a security event metric.
 * @param {string} severity - 'info' | 'low' | 'medium' | 'high' | 'critical'
 */
function recordSecurityEventSeverity(severity) {
  const normSev = (severity || 'info').toLowerCase();
  if (metrics.security.eventsBySeverity[normSev] !== undefined) {
    metrics.security.eventsBySeverity[normSev]++;
  } else {
    metrics.security.eventsBySeverity.info++;
  }
}

/**
 * Increments containment actions count.
 * @param {'automated' | 'manual'} type
 */
function recordContainmentAction(type) {
  if (type === 'automated') {
    metrics.security.automatedContainmentActions++;
  } else {
    metrics.security.manualContainmentActions++;
  }
}

/**
 * Updates security incident counters.
 * @param {number} open
 * @param {number} critical
 */
function updateIncidentCounts(open = 0, critical = 0) {
  metrics.security.openIncidents = Math.max(0, open);
  metrics.security.criticalIncidents = Math.max(0, critical);
}

/**
 * Generates an aggregated, sanitized metrics snapshot.
 * Safe for administrative viewing; contains ZERO sensitive data.
 *
 * @returns {object} Aggregate metrics
 */
function getSnapshot() {
  const uptimeSeconds = Math.floor(process.uptime());

  return {
    service: 'onecoolie-api',
    uptimeSeconds,
    startedAt: metrics.startedAt,
    timestamp: new Date().toISOString(),
    http: {
      totalRequests: metrics.http.totalRequests,
      requestsByMethod: { ...metrics.http.requestsByMethod },
      statusCategories: { ...metrics.http.statusCategories },
      errorCount4xx: metrics.http.errorCount4xx,
      errorCount5xx: metrics.http.errorCount5xx,
      durationMs: { ...metrics.http.durations }
    },
    auth: { ...metrics.auth },
    session: {
      sessionsCreated: metrics.session.sessionsCreated,
      sessionsRevoked: metrics.session.sessionsRevoked,
      logoutEvents: metrics.session.logoutEvents,
      logoutAllEvents: metrics.session.logoutAllEvents,
      activeSocketConnections: metrics.session.activeSocketConnections
    },
    security: {
      eventsBySeverity: { ...metrics.security.eventsBySeverity },
      openIncidents: metrics.security.openIncidents,
      criticalIncidents: metrics.security.criticalIncidents,
      containmentActions: {
        automated: metrics.security.automatedContainmentActions,
        manual: metrics.security.manualContainmentActions
      }
    }
  };
}

/**
 * Resets metrics store. Intended for automated testing only.
 */
function resetMetrics() {
  metrics.startedAt = new Date().toISOString();
  metrics.http.totalRequests = 0;
  metrics.http.requestsByMethod = {};
  metrics.http.requestsByRoute = {};
  metrics.http.statusCategories = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  metrics.http.errorCount4xx = 0;
  metrics.http.errorCount5xx = 0;
  metrics.http.durations = { count: 0, totalMs: 0, minMs: null, maxMs: 0, avgMs: 0 };

  metrics.auth.loginSuccessCount = 0;
  metrics.auth.loginFailureCount = 0;
  metrics.auth.mfaSuccessCount = 0;
  metrics.auth.mfaFailureCount = 0;
  metrics.auth.accountLockoutCount = 0;
  metrics.auth.tokenRefreshSuccessCount = 0;
  metrics.auth.tokenRefreshFailureCount = 0;
  metrics.auth.refreshTokenReuseCount = 0;

  metrics.session.sessionsCreated = 0;
  metrics.session.sessionsRevoked = 0;
  metrics.session.logoutEvents = 0;
  metrics.session.logoutAllEvents = 0;
  metrics.session.activeSocketConnections = 0;
  metrics.session.socketDisconnectReasons = {};

  metrics.security.eventsBySeverity = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  metrics.security.openIncidents = 0;
  metrics.security.criticalIncidents = 0;
  metrics.security.automatedContainmentActions = 0;
  metrics.security.manualContainmentActions = 0;
}

module.exports = {
  recordHttpRequest,
  recordAuthMetric,
  recordSessionMetric,
  recordSocketActivity,
  recordSecurityEventSeverity,
  recordContainmentAction,
  updateIncidentCounts,
  getSnapshot,
  resetMetrics
};

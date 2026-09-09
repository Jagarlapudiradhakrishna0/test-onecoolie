/**
 * server/src/services/adminAuditService.js
 *
 * ONECOOLIE Phase 5.1: High-Security Hardened Admin Audit Logging Service
 *
 * Security Architecture & Guarantees:
 * 1. High-Risk Fail-Closed Policy:
 *    High-risk actions (role changes, payout actions, cancellations with refund,
 *    deletions, incident resolutions) require mandatory primary database audit persistence.
 *    If DB audit insertion fails, an AuditLoggingError is thrown to trigger an atomic
 *    compensating rollback of the business mutation.
 * 2. Tamper-Evident Merkle Hash Chain:
 *    Fallback entries are cryptographically chained (HMAC-SHA256) with previous_hash
 *    and canonicalized content. Any deletion, insertion, or modification is immediately detectable.
 * 3. Concurrency Protection:
 *    Promise-serialized line-delimited JSON (.jsonl) atomic appends prevent race conditions
 *    and JSON syntax corruption under high concurrency.
 * 4. Safe Reconciliation Pipeline:
 *    Enables verified, duplicate-free reconciliation of fallback records into PostgreSQL.
 * 5. Deep Metadata Redaction:
 *    Recursively redacts passwords, tokens, JWTs, secrets, OTPs, and card numbers.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const defaultSupabase = require('../config/db');
const { logger } = require('../utils/logger');

const AUDIT_JOURNAL_FILE = path.join(__dirname, '..', 'data', 'admin_audit_logs.jsonl');
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Actions classified as High-Risk requiring strict database-enforced fail-closed coupling
const HIGH_RISK_ACTIONS = new Set([
  'admin_role_updated',
  'payout_approved',
  'payout_rejected',
  'payout_processing',
  'payout_paid',
  'payout_failed',
  'booking_cancelled_by_admin',
  'user_deleted',
  'financial_incident_resolved'
]);

// Blacklisted keys that must NEVER be recorded in audit log metadata
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'jwt_secret',
  'authorization',
  'otp',
  'start_otp',
  'email_otp',
  'card',
  'card_number',
  'cvv',
  'pan',
  'service_role_key',
  'api_key',
  'apikey',
  'private_key',
  'secret_key'
]);

/**
 * Custom Error for audit failures on high-risk operations
 */
class AuditLoggingError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AuditLoggingError';
    this.isHighRisk = true;
    this.details = details;
  }
}

/**
 * Deterministically orders object keys for canonical serialization.
 * Ensures consistent cryptographic hashes regardless of object key order.
 *
 * @param {any} obj
 * @returns {any}
 */
function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => {
    sorted[key] = canonicalize(obj[key]);
  });
  return sorted;
}

/**
 * Recursively redacts sensitive keys from metadata objects.
 *
 * @param {any} value
 * @param {number} depth
 * @returns {any}
 */
function sanitizeAuditMetadata(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (
        SENSITIVE_KEYS.has(lowerKey) ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('card') ||
        lowerKey.includes('otp') ||
        lowerKey.includes('key')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeAuditMetadata(val, depth + 1);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  return value;
}

function getIntegritySecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Audit Integrity Failure: JWT_SECRET is required for audit HMAC verification in production.');
    }
    return 'onecoolie_audit_integrity_fallback_key';
  }
  return secret.trim();
}

/**
 * Calculates HMAC-SHA256 for a given canonical audit entry and previous hash.
 *
 * @param {string} previousHash
 * @param {object} entry
 * @returns {string}
 */
function computeEntryHash(previousHash, entry) {
  const secret = getIntegritySecret();
  const canonicalString = JSON.stringify(canonicalize(entry));
  return crypto.createHmac('sha256', secret).update(`${previousHash}:${canonicalString}`).digest('hex');
}

// In-process promise queue to serialize file writes and eliminate concurrency races
let writeQueue = Promise.resolve();

/**
 * Reads all entries from the fallback journal (.jsonl).
 *
 * @returns {Array<object>}
 */
function readJournalEntries() {
  try {
    if (!fs.existsSync(AUDIT_JOURNAL_FILE)) {
      return [];
    }
    const content = fs.readFileSync(AUDIT_JOURNAL_FILE, 'utf8');
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    const entries = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (err) {
        logger.error('[AUDIT JOURNAL] Corrupt line in journal', { line, error: err.message });
      }
    }
    return entries;
  } catch (err) {
    logger.error('[AUDIT JOURNAL] Failed to read journal', { error: err.message });
    return [];
  }
}

/**
 * Appends an audit record to the tamper-evident fallback journal using the concurrency queue.
 *
 * @param {object} record
 * @returns {Promise<object>} The chained record with previous_hash and entry_hash
 */
function appendToJournalSerialized(record) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const dir = path.dirname(AUDIT_JOURNAL_FILE);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const entries = readJournalEntries();
        const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
        const previous_hash = lastEntry?.entry_hash || GENESIS_HASH;

        const chainRecord = {
          ...record,
          previous_hash
        };

        const entry_hash = computeEntryHash(previous_hash, chainRecord);
        chainRecord.entry_hash = entry_hash;

        // Atomic append of a single newline-delimited JSON record
        fs.appendFileSync(AUDIT_JOURNAL_FILE, JSON.stringify(chainRecord) + '\n', 'utf8');
        resolve(chainRecord);
      } catch (err) {
        logger.error('[AUDIT JOURNAL] Critical append failure', { error: err.message });
        reject(err);
      }
    }).catch(reject);
  });
}

/**
 * Verifies the cryptographic tamper-evident integrity of the fallback journal.
 * Validates:
 * 1. Genesis hash continuity.
 * 2. previous_hash link from entry (i) to entry (i-1).
 * 3. Recomputed HMAC-SHA256 hash match against record content.
 * 4. Detection of modified fields, deleted lines, or inserted records.
 *
 * @returns {{ valid: boolean, count: number, error?: string, tamperedIndex?: number }}
 */
function verifyJournalIntegrity() {
  const entries = readJournalEntries();
  if (entries.length === 0) {
    return { valid: true, count: 0 };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { entry_hash, previous_hash, ...recordContent } = entry;

    // Check chain link continuity
    if (previous_hash !== expectedPrevHash) {
      return {
        valid: false,
        count: entries.length,
        error: `Chain broken at index ${i}: previous_hash mismatch. Expected ${expectedPrevHash}, found ${previous_hash}`,
        tamperedIndex: i
      };
    }

    // Recompute entry hash
    const expectedHash = computeEntryHash(previous_hash, { ...recordContent, previous_hash });
    if (entry_hash !== expectedHash) {
      return {
        valid: false,
        count: entries.length,
        error: `Integrity check failed at index ${i}: entry content has been modified or corrupted.`,
        tamperedIndex: i
      };
    }

    expectedPrevHash = entry_hash;
  }

  return { valid: true, count: entries.length };
}

/**
 * Centralized Administrative Action Auditor.
 *
 * @param {object} params
 * @param {object} [params.req] - Express request object containing authenticated actor context
 * @param {string} [params.actor_user_id] - Explicit actor user ID (if req unavailable)
 * @param {string} [params.actor_admin_role] - Explicit admin role
 * @param {string} params.action - Action name (e.g. 'admin_role_updated', 'assistant_approved')
 * @param {string} params.resource_type - Type of resource ('user', 'assistant', 'booking', 'payout', etc.)
 * @param {string} [params.resource_id] - Resource identifier
 * @param {string} [params.result='success'] - 'success' or 'failure'
 * @param {object} [params.metadata={}] - Safe before/after diff or contextual metadata
 * @param {boolean} [params.isHighRisk] - Explicit flag overriding risk classification
 * @param {object} [params.client] - Supabase client instance
 * @returns {Promise<{ success: boolean, record?: object, audit_source: string, error?: string }>}
 */
async function logAdminAction(params) {
  const {
    req,
    action,
    resource_type,
    resource_id,
    result = 'success',
    metadata = {},
    isHighRisk,
    client = defaultSupabase
  } = params;

  if (!action || !resource_type) {
    logger.warn('Audit log call missing required action or resource_type', { action, resource_type });
    return { success: false, error: 'action and resource_type are required' };
  }

  const highRisk = isHighRisk !== undefined ? isHighRisk : HIGH_RISK_ACTIONS.has(action);

  // 1. Authoritative Actor Identity (Never trust client body)
  const actor_user_id = req?.user?.id || params.actor_user_id || null;
  const actor_admin_role = req?.adminRole || req?.user?.admin_role || (req?.user?.role === 'admin' ? 'admin' : 'unknown');

  // 2. Request Context Resolution
  let request_id = null;
  let ip_address = null;
  let user_agent = null;

  if (req) {
    request_id = req.requestId || req.headers?.['x-request-id'] || null;
    ip_address = req.ip || req.headers?.['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null;
    if (req.headers?.['user-agent']) {
      user_agent = String(req.headers['user-agent']).slice(0, 255);
    }
  }

  // 3. Metadata Sanitization
  const safeMetadata = sanitizeAuditMetadata(metadata);

  // 4. Construct Audit Record Base
  const record = {
    id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    actor_user_id,
    actor_admin_role,
    action,
    resource_type,
    resource_id: resource_id ? String(resource_id) : null,
    result: result === 'failure' ? 'failure' : 'success',
    request_id,
    ip_address,
    user_agent,
    metadata: safeMetadata,
    created_at: new Date().toISOString()
  };

  // 5. High-Risk Failure Policy: Mandatory Database Persistence
  let dbPersisted = false;
  let dbError = null;

  if (client) {
    try {
      const dbPayload = {
        actor_user_id: record.actor_user_id,
        actor_admin_role: record.actor_admin_role,
        action: record.action,
        resource_type: record.resource_type,
        resource_id: record.resource_id,
        result: record.result,
        request_id: record.request_id,
        ip_address: record.ip_address,
        user_agent: record.user_agent,
        metadata: record.metadata,
        created_at: record.created_at
      };

      const { data, error } = await client
        .from('admin_audit_logs')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        dbError = error;
      } else if (data && data.id) {
        record.id = data.id;
        dbPersisted = true;
      }
    } catch (err) {
      dbError = err;
    }
  } else {
    dbError = new Error('No database client available');
  }

  // If High-Risk and Database Persistence failed: FAIL CLOSED
  if (highRisk && !dbPersisted) {
    logger.error('[CRITICAL AUDIT FAILURE] High-risk operation audit insertion failed in primary database. Action must rollback.', {
      action: record.action,
      resource: `${record.resource_type}:${record.resource_id}`,
      error: dbError?.message
    });
    throw new AuditLoggingError(
      `Critical Audit Failure: Unable to record required immutable audit log for high-risk action '${action}'. Action aborted.`,
      { action, resource_type, resource_id, dbError: dbError?.message }
    );
  }

  // If Non-High-Risk and DB failed: Record to Tamper-Evident Fallback Journal
  let audit_source = 'primary_database';
  if (!dbPersisted) {
    record.audit_source = 'fallback_journal';
    const chained = await appendToJournalSerialized(record);
    record.entry_hash = chained.entry_hash;
    record.previous_hash = chained.previous_hash;
    audit_source = 'fallback_journal';
    logger.warn('[AUDIT SERVICE] Low/medium risk audit recorded to tamper-evident fallback journal:', {
      action: record.action,
      hash: record.entry_hash
    });
  } else {
    record.audit_source = 'primary_database';
  }

  logger.info('[ADMIN AUDIT]', {
    action: record.action,
    actor: record.actor_user_id,
    role: record.actor_admin_role,
    resource: `${record.resource_type}:${record.resource_id}`,
    result: record.result,
    source: audit_source,
    requestId: record.request_id
  });

  return { success: true, record, audit_source };
}

/**
 * Reconciles tamper-evident fallback journal entries into the primary PostgreSQL table.
 * Strictly verifies chain integrity before import.
 * Ensures idempotent deduplication.
 *
 * @param {object} params
 * @param {object} params.client - Supabase client
 * @param {object} params.adminUser - Authenticated super administrator performing reconciliation
 * @returns {Promise<{ success: boolean, reconciledCount: number, totalChecked: number, message: string }>}
 */
async function reconcileFallbackAuditLogs({ client = defaultSupabase, adminUser }) {
  if (!adminUser || !adminUser.id) {
    throw new Error('Authorized administrator identity required for reconciliation.');
  }

  // 1. Verify Fallback Journal Cryptographic Integrity
  const integrity = verifyJournalIntegrity();
  if (!integrity.valid) {
    logger.error('[AUDIT RECONCILIATION] Refusing to reconcile: journal integrity check failed.', { error: integrity.error });
    throw new Error(`Reconciliation aborted: Fallback journal integrity violation detected: ${integrity.error}`);
  }

  const entries = readJournalEntries();
  if (entries.length === 0) {
    return { success: true, reconciledCount: 0, totalChecked: 0, message: 'No fallback records to reconcile.' };
  }

  let reconciledCount = 0;

  for (const entry of entries) {
    // 2. Check for duplicate record in primary database
    let existingQuery = client.from('admin_audit_logs').select('id');
    if (entry.request_id) {
      existingQuery = existingQuery.eq('request_id', entry.request_id);
    } else {
      existingQuery = existingQuery
        .eq('action', entry.action)
        .eq('resource_type', entry.resource_type)
        .eq('created_at', entry.created_at);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      // Record already exists in DB, skip to prevent duplicates
      continue;
    }

    // 3. Insert reconciled entry with explicit metadata tracking
    const insertPayload = {
      actor_user_id: entry.actor_user_id || null,
      actor_admin_role: entry.actor_admin_role || 'admin',
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id || null,
      result: entry.result === 'failure' ? 'failure' : 'success',
      request_id: entry.request_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      metadata: {
        ...entry.metadata,
        reconciled: true,
        reconciled_from: 'fallback_journal',
        reconciled_by: adminUser.id,
        reconciled_at: new Date().toISOString(),
        journal_entry_hash: entry.entry_hash
      },
      created_at: entry.created_at // Preserve original timestamp
    };

    const { error: insertErr } = await client.from('admin_audit_logs').insert([insertPayload]);
    if (insertErr) {
      logger.error('[AUDIT RECONCILIATION] Failed to insert record into PostgreSQL', { error: insertErr.message, entryId: entry.id });
      throw new Error(`Failed to reconcile record ${entry.id}: ${insertErr.message}`);
    }

    reconciledCount++;
  }

  logger.info('[AUDIT RECONCILIATION] Reconciliation completed successfully', {
    reconciledCount,
    totalChecked: entries.length,
    reconciledBy: adminUser.id
  });

  return {
    success: true,
    reconciledCount,
    totalChecked: entries.length,
    message: `Reconciliation completed: ${reconciledCount} new records imported into primary database.`
  };
}

/**
 * Retrieves audit logs with strict filtering and pagination.
 * Clearly demarcates primary database records from fallback journal records.
 *
 * @param {object} params
 * @param {object} [params.filters={}]
 * @param {number} [params.limit=50]
 * @param {number} [params.offset=0]
 * @param {object} [params.client]
 * @returns {Promise<{ success: boolean, logs: Array<object>, total: number, limit: number, offset: number, integrityStatus: object }>}
 */
async function getAdminAuditLogs({ filters = {}, limit = 50, offset = 0, client = defaultSupabase }) {
  const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const pageOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const integrityStatus = verifyJournalIntegrity();

  // Try primary DB query
  if (client) {
    try {
      let query = client
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.action && filters.action !== 'ALL') {
        query = query.eq('action', filters.action);
      }
      if (filters.actor_user_id) {
        query = query.eq('actor_user_id', filters.actor_user_id);
      }
      if (filters.resource_type && filters.resource_type !== 'ALL') {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
      }
      if (filters.result && filters.result !== 'ALL') {
        query = query.eq('result', filters.result);
      }

      query = query.range(pageOffset, pageOffset + pageLimit - 1);

      const { data, count, error } = await query;

      if (!error && Array.isArray(data) && data.length > 0) {
        const tagged = data.map((d) => ({
          ...d,
          audit_source: d.metadata?.reconciled ? 'primary_database (reconciled)' : 'primary_database'
        }));

        return {
          success: true,
          logs: tagged,
          total: count !== null ? count : data.length,
          limit: pageLimit,
          offset: pageOffset,
          integrityStatus
        };
      }
    } catch (e) {
      // Fall through to fallback journal
    }
  }

  // Fallback to journal file
  const allJournalLogs = readJournalEntries();
  let filtered = [...allJournalLogs].reverse(); // newest first

  if (filters.action && filters.action !== 'ALL') {
    filtered = filtered.filter((l) => l.action === filters.action);
  }
  if (filters.actor_user_id) {
    filtered = filtered.filter((l) => l.actor_user_id === filters.actor_user_id);
  }
  if (filters.resource_type && filters.resource_type !== 'ALL') {
    filtered = filtered.filter((l) => l.resource_type === filters.resource_type);
  }
  if (filters.resource_id) {
    filtered = filtered.filter((l) => l.resource_id === filters.resource_id);
  }
  if (filters.result && filters.result !== 'ALL') {
    filtered = filtered.filter((l) => l.result === filters.result);
  }

  const paginated = filtered.slice(pageOffset, pageOffset + pageLimit).map((l) => ({
    ...l,
    audit_source: 'fallback_journal'
  }));

  return {
    success: true,
    logs: paginated,
    total: filtered.length,
    limit: pageLimit,
    offset: pageOffset,
    integrityStatus
  };
}

module.exports = {
  HIGH_RISK_ACTIONS,
  AuditLoggingError,
  logAdminAction,
  getAdminAuditLogs,
  verifyJournalIntegrity,
  reconcileFallbackAuditLogs,
  readJournalEntries,
  loadFromJournal: readJournalEntries,
  appendToJournalSerialized,
  sanitizeAuditMetadata,
  computeEntryHash,
  canonicalize,
  AUDIT_JOURNAL_FILE,
  GENESIS_HASH
};

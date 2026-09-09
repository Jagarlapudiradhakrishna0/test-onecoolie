/**
 * server/src/config/rbac.js
 *
 * Centralized Role-Based Access Control (RBAC) System for ONECOOLIE
 *
 * Defines administrative roles, granular permission keys, and authoritative
 * server-side permission evaluation rules.
 */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPERATIONS_ADMIN: 'operations_admin',
  ASSISTANT_ADMIN: 'assistant_admin',
  FINANCE_ADMIN: 'finance_admin',
  SAFETY_ADMIN: 'safety_admin',
  SUPPORT_ADMIN: 'support_admin',
  AUDITOR: 'auditor'
};

const PERMISSIONS = {
  // Dashboard & Overview
  DASHBOARD_VIEW: 'dashboard.view',

  // Bookings & Missions
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_MANAGE: 'bookings.manage',

  // Passenger & User Directory
  PASSENGERS_VIEW: 'passengers.view',
  PASSENGERS_MANAGE: 'passengers.manage',

  // Assistant Force & KYC
  ASSISTANTS_VIEW: 'assistants.view',
  ASSISTANTS_APPROVE: 'assistants.approve',
  ASSISTANTS_MANAGE: 'assistants.manage',

  // Sahayak Payouts & Settlement
  PAYOUTS_VIEW: 'payouts.view',
  PAYOUTS_APPROVE: 'payouts.approve',
  PAYOUTS_PROCESS: 'payouts.process',

  // Finance, Reconciliation & Launch Ops
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',

  // Emergency SOS & Security
  SOS_VIEW: 'sos.view',
  SOS_MANAGE: 'sos.manage',

  // Incident Command
  INCIDENTS_VIEW: 'incidents.view',
  INCIDENTS_MANAGE: 'incidents.manage',

  // Station Desk & Support Tickets
  SUPPORT_VIEW: 'support.view',
  SUPPORT_MANAGE: 'support.manage',

  // Audit Logs & Forensics
  AUDIT_VIEW: 'audit.view',

  // Admin Account & RBAC Role Management
  ADMINS_MANAGE: 'admins.manage',

  // Phase 6.7: Security Monitoring & Incident Response
  SECURITY_READ: 'security:read',
  SECURITY_RESPOND: 'security:respond',
  SECURITY_MANAGE: 'security:manage',

  // Phase 6.8: Operations & Production Reliability
  OPERATIONS_READ: 'operations:read',
  OPERATIONS_VERIFY: 'operations:verify',
  OPERATIONS_MANAGE: 'operations:manage'
};

/**
 * Server-side role-to-permission mapping.
 * SUPER_ADMIN has wildcard access ('*').
 * All other roles follow strict least-privilege principles.
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'],

  [ROLES.OPERATIONS_ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.PASSENGERS_VIEW,
    PERMISSIONS.PASSENGERS_MANAGE,
    PERMISSIONS.ASSISTANTS_VIEW,
    PERMISSIONS.SUPPORT_VIEW,
    PERMISSIONS.SUPPORT_MANAGE,
    PERMISSIONS.SOS_VIEW,
    PERMISSIONS.OPERATIONS_READ,
    PERMISSIONS.OPERATIONS_VERIFY
  ],

  [ROLES.ASSISTANT_ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ASSISTANTS_VIEW,
    PERMISSIONS.ASSISTANTS_APPROVE,
    PERMISSIONS.ASSISTANTS_MANAGE,
    PERMISSIONS.PASSENGERS_VIEW,
    PERMISSIONS.SUPPORT_VIEW
  ],

  [ROLES.FINANCE_ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.PAYOUTS_VIEW,
    PERMISSIONS.PAYOUTS_APPROVE,
    PERMISSIONS.PAYOUTS_PROCESS,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.AUDIT_VIEW
  ],

  [ROLES.SAFETY_ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.SOS_VIEW,
    PERMISSIONS.SOS_MANAGE,
    PERMISSIONS.INCIDENTS_VIEW,
    PERMISSIONS.INCIDENTS_MANAGE,
    PERMISSIONS.SECURITY_READ,
    PERMISSIONS.SECURITY_RESPOND,
    PERMISSIONS.OPERATIONS_READ
  ],

  [ROLES.SUPPORT_ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.PASSENGERS_VIEW,
    PERMISSIONS.SUPPORT_VIEW,
    PERMISSIONS.SUPPORT_MANAGE
  ],

  [ROLES.AUDITOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.PASSENGERS_VIEW,
    PERMISSIONS.ASSISTANTS_VIEW,
    PERMISSIONS.PAYOUTS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.SOS_VIEW,
    PERMISSIONS.INCIDENTS_VIEW,
    PERMISSIONS.SUPPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SECURITY_READ,
    PERMISSIONS.OPERATIONS_READ
  ]
};

/**
 * Normalizes an admin role string.
 * @param {string} role
 * @returns {string|null}
 */
function normalizeAdminRole(role) {
  if (!role || typeof role !== 'string') return null;
  const clean = role.trim().toLowerCase();
  if (Object.values(ROLES).includes(clean)) return clean;
  return null;
}

/**
 * Returns the list of permissions granted to a given admin role.
 * @param {string} adminRole
 * @returns {string[]}
 */
function getPermissionsForRole(adminRole) {
  const normRole = normalizeAdminRole(adminRole);
  if (!normRole) return [];
  return ROLE_PERMISSIONS[normRole] || [];
}

/**
 * Evaluates whether an admin role has a specific permission.
 * @param {string} adminRole
 * @param {string} permission
 * @returns {boolean}
 */
function hasPermission(adminRole, permission) {
  if (!permission) return true;
  const perms = getPermissionsForRole(adminRole);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  normalizeAdminRole,
  getPermissionsForRole,
  hasPermission
};

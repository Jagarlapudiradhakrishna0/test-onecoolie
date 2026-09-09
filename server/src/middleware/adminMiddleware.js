/**
 * server/src/middleware/adminMiddleware.js
 *
 * RBAC and Admin Perimeter Protection Middleware for ONECOOLIE
 */

const supabase = require('../config/db');
const {
  hasPermission,
  getPermissionsForRole,
  normalizeAdminRole
} = require('../config/rbac');
const { isApprovedAdminEmail } = require('../config/adminAllowlist');

/**
 * Basic perimeter check — enforces that caller is authenticated, has admin role,
 * and possesses an approved administrator email identity.
 */
const adminOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required.' });
  }

  // Authoritative server-side email & approval check
  let email = req.user.email;
  if (!email && req.user.id) {
    const { data: u } = await supabase
      .from('users')
      .select('email, is_approved')
      .eq('id', req.user.id)
      .maybeSingle();
    if (u) {
      email = u.email;
      if (u.is_approved === false) {
        return res.status(403).json({ message: 'Administrator account has been disabled or suspended.' });
      }
    }
  }

  if (!isApprovedAdminEmail(email)) {
    return res.status(403).json({ message: 'Administrator access is not authorized for this account.' });
  }

  return next();
};

/**
 * Resolves an admin user's specific sub-role authoritatively from the database.
 * FAILS CLOSED: Requires an explicit, valid admin_role in the database AND an approved admin identity.
 * NEVER defaults or falls back to 'super_admin'.
 * Non-admin users (passenger/assistant) ALWAYS resolve to null.
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function resolveAdminRole(userId) {
  if (!userId) return null;

  try {
    // 1. Query user record for base role, sub-role, email, and status
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, kyc_documents, admin_role, is_approved')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // Column may not exist yet in unmigrated database
      if (error.message && error.message.includes('admin_role')) {
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('id, email, role, kyc_documents, is_approved')
          .eq('id', userId)
          .maybeSingle();

        if (fallbackUser && fallbackUser.role === 'admin' && isApprovedAdminEmail(fallbackUser.email) && fallbackUser.is_approved !== false) {
          const docRole = fallbackUser.kyc_documents?.admin_role;
          return normalizeAdminRole(docRole) || null;
        }
      }
      return null;
    }

    // Fail closed: Must exist, have base role 'admin', have approved email, and be active
    if (!user || user.role !== 'admin' || !isApprovedAdminEmail(user.email) || user.is_approved === false) {
      return null;
    }

    // Direct column priority, then kyc_documents fallback, then fail closed (null)
    const resolved = user.admin_role || user.kyc_documents?.admin_role;
    return normalizeAdminRole(resolved) || null;
  } catch (err) {
    console.error('RESOLVE_ADMIN_ROLE ERROR:', err.message);
    return null;
  }
}

/**
 * Granular Permission Enforcement Middleware.
 * Resolves role server-side and evaluates least-privilege permissions.
 *
 * @param {string} permission - The permission identifier required (e.g. 'payouts.approve')
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    // 1. Perimeter authentication check
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required.' });
    }

    // 2. Authoritative server-side role resolution (fails closed)
    const adminRole = await module.exports.resolveAdminRole(req.user.id);
    if (!adminRole) {
      return res.status(403).json({
        message: 'Access denied: Valid admin sub-role required. Authorization failed closed.'
      });
    }

    // 3. Attach verified role and permission set to request context
    req.adminRole = adminRole;
    req.adminPermissions = getPermissionsForRole(adminRole);

    // 4. Permission check
    if (!hasPermission(adminRole, permission)) {
      return res.status(403).json({
        message: `Permission denied: '${permission}' required for this operation.`
      });
    }

    return next();
  };
};

module.exports = {
  adminOnly,
  requirePermission,
  resolveAdminRole
};
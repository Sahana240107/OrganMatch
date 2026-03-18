// middleware/rbac.middleware.js
// Role-Based Access Control middleware.
// Usage: requireRole('national_admin')
//        requireRole('national_admin', 'transplant_coordinator')

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // verifyJWT must run before this middleware
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

// Convenience guards — use directly in routes for readability
const isAdmin       = requireRole('national_admin');
const isCoordinator = requireRole('national_admin', 'transplant_coordinator');
const isStaff       = requireRole('national_admin', 'transplant_coordinator', 'hospital_staff');
const isAuditor     = requireRole('national_admin', 'auditor');

module.exports = { requireRole, isAdmin, isCoordinator, isStaff, isAuditor };
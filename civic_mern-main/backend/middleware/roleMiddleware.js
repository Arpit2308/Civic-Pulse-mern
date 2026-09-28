// Middleware to restrict route access based on user role
// Must be used AFTER authMiddleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

module.exports = requireRole;

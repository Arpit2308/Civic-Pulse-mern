const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { registerUser, loginUser, updateUserRole } = require('../controllers/authController');
const {
  registerValidation,
  loginValidation,
  updateUserRoleValidation,
} = require('../middleware/validator');

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);

// Promote or update user role (super_admin only) -> PATCH /api/auth/users/:id/role
router.patch('/users/:id/role', auth, requireRole('super_admin'), updateUserRoleValidation, updateUserRole);

module.exports = router;
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { registerValidation } = require('../middleware/validator');
const { createWorker, getWorkers, getAdminStats } = require('../controllers/adminController');

// GET /api/admin/workers (dept_admin + super_admin)
router.get('/workers', auth, requireRole('dept_admin', 'super_admin'), getWorkers);

// GET /api/admin/stats (dept_admin + super_admin)
router.get('/stats', auth, requireRole('dept_admin', 'super_admin'), getAdminStats);

// POST /api/admin/workers (super_admin only)
router.post('/workers', auth, requireRole('super_admin'), registerValidation, createWorker);

module.exports = router;

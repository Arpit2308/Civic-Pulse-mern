const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { registerValidation } = require('../middleware/validator');
const { createWorker } = require('../controllers/adminController');

// POST /api/admin/workers (super_admin only)
router.post('/workers', auth, requireRole('super_admin'), registerValidation, createWorker);

module.exports = router;

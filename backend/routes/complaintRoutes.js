const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { uploadSingleImage } = require('../utils/storage');
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getComplaintStats,
} = require('../controllers/complaintController');
const {
  createComplaintValidation,
  updateComplaintStatusValidation,
} = require('../middleware/validator');

// Get Complaint Aggregation Statistics (Admin Only: dept_admin, super_admin) -> GET /api/complaints/stats
router.get('/stats', auth, requireRole('dept_admin', 'super_admin'), getComplaintStats);

// Create Complaint (Protected - Login Required) -> POST /api/complaints (accepts multipart/form-data with image upload)
router.post('/', auth, uploadSingleImage, createComplaintValidation, createComplaint);

// Get Complaints (Protected - Login Required) -> GET /api/complaints
router.get('/', auth, getComplaints);

// Get Single Complaint by ID (Owner or Admin only) -> GET /api/complaints/:id
router.get('/:id', auth, getComplaintById);

// Update Complaint Status (Admin Only: dept_admin, super_admin) -> PUT /api/complaints/:id/status
router.put('/:id/status', auth, requireRole('dept_admin', 'super_admin'), updateComplaintStatusValidation, updateComplaintStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { uploadSingleImage } = require('../utils/storage');
const {
  createIssue,
  getIssues,
  upvoteIssue,
  updateIssueStatus,
  getIssueStats,
  assignWorker,
  resolveIssue,
} = require('../controllers/issueController');
const {
  createIssueValidation,
  upvoteIssueValidation,
  updateIssueStatusValidation,
} = require('../middleware/validator');

// Get Issue Aggregation Statistics (Admin Only: dept_admin, super_admin) -> GET /api/issues/stats
router.get('/stats', auth, requireRole('dept_admin', 'super_admin'), getIssueStats);

// Get All Issues (Public View / With Filters) -> GET /api/issues
router.get('/', getIssues);

// Create Issue (Protected - Login Required) -> POST /api/issues (accepts multipart/form-data with image upload)
router.post('/', auth, uploadSingleImage, createIssueValidation, createIssue);

// Upvote Issue (Protected - Login Required) -> PUT /api/issues/:id/upvote
router.put('/:id/upvote', auth, upvoteIssueValidation, upvoteIssue);

// Update Issue Status & Priority (Admin Only: dept_admin, super_admin) -> PUT /api/issues/:id/status
router.put('/:id/status', auth, requireRole('dept_admin', 'super_admin'), updateIssueStatusValidation, updateIssueStatus);

// Assign Worker to Issue (Admin Only: dept_admin, super_admin) -> PATCH /api/issues/:id/assign
router.patch('/:id/assign', auth, requireRole('dept_admin', 'super_admin'), assignWorker);

// Resolve Issue with Proof Photo (worker, dept_admin, super_admin) -> PUT /api/issues/:id/resolve
router.put('/:id/resolve', auth, uploadSingleImage, resolveIssue);

module.exports = router;
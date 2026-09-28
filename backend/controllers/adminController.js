const User = require('../models/User');
const CivicIssue = require('../models/CivicIssue');
const ConsumerComplaint = require('../models/ConsumerComplaint');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * POST /api/admin/workers
 * Creates a worker account directly with role='worker'.
 * Access: super_admin only
 */
const createWorker = asyncHandler(async (req, res) => {
  const { name, email, password, department, phone, pincode } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const worker = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'worker',
    department: department || null,
    phone: phone || '',
    pincode: pincode || '',
  });

  return res.status(201).json({
    success: true,
    message: 'Worker created successfully',
    user: {
      id: worker._id,
      name: worker.name,
      email: worker.email,
      role: worker.role,
      department: worker.department,
    },
  });
});

/**
 * GET /api/admin/workers
 * List all workers with optional ?department= filter.
 * Access: dept_admin, super_admin
 */
const getWorkers = asyncHandler(async (req, res) => {
  const { department } = req.query;
  const filter = { role: 'worker' };

  if (department) {
    filter.department = department;
  }

  const workers = await User.find(filter)
    .select('name email department phone')
    .sort({ createdAt: -1 });

  return res.status(200).json(workers);
});

/**
 * GET /api/admin/stats
 * Aggregated administrative metrics for civic issues, complaints, and workers.
 * Access: dept_admin, super_admin
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalIssues,
    assignedCount,
    unassignedCount,
    totalWorkers,
    totalComplaints,
    byStatusAgg,
    byCategoryAgg,
    byPriorityAgg,
    resolvedIssues,
  ] = await Promise.all([
    CivicIssue.countDocuments({}),
    CivicIssue.countDocuments({ assignedWorker: { $ne: null } }),
    CivicIssue.countDocuments({ assignedWorker: null }),
    User.countDocuments({ role: 'worker' }),
    ConsumerComplaint.countDocuments({}),
    CivicIssue.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    CivicIssue.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    CivicIssue.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    CivicIssue.find({
      status: 'Resolved',
      'resolutionDetails.resolvedAt': { $ne: null },
    }).select('createdAt resolutionDetails.resolvedAt'),
  ]);

  let avgResolutionHours = 0;
  if (resolvedIssues.length > 0) {
    const totalMs = resolvedIssues.reduce((sum, issue) => {
      const resolvedAt = new Date(issue.resolutionDetails.resolvedAt).getTime();
      const createdAt = new Date(issue.createdAt).getTime();
      return sum + Math.max(0, resolvedAt - createdAt);
    }, 0);
    const avgMs = totalMs / resolvedIssues.length;
    avgResolutionHours = Number((avgMs / (1000 * 60 * 60)).toFixed(2));
  }

  return res.status(200).json({
    success: true,
    totalIssues,
    byStatus: byStatusAgg,
    byCategory: byCategoryAgg,
    byPriority: byPriorityAgg,
    assignedCount,
    unassignedCount,
    totalWorkers,
    avgResolutionHours,
    totalComplaints,
  });
});

module.exports = {
  createWorker,
  getWorkers,
  getAdminStats,
};

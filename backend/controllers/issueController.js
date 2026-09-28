const mongoose = require('mongoose');
const CivicIssue = require('../models/CivicIssue');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { getFileUrl } = require('../utils/storage');

/**
 * Maps an issue category to one of the designated departments:
 * - Roads & Potholes
 * - Sanitation & Garbage
 * - Street Lighting
 * - Water Supply
 * - General (Catch-all for 'Other' / unmapped categories)
 */
const mapCategoryToDepartment = (category) => {
  switch (category) {
    case 'Roads':
    case 'Roads & Potholes':
      return 'Roads & Potholes';
    case 'Garbage':
    case 'Sanitation & Garbage':
      return 'Sanitation & Garbage';
    case 'Street Lighting':
    case 'Lighting':
    case 'Electricity':
      return 'Street Lighting';
    case 'Water':
    case 'Water Supply':
      return 'Water Supply';
    case 'Other':
    default:
      return 'General'; // General catch-all for 'Other' / unmapped categories
  }
};

// 1. Create New Civic Issue
exports.createIssue = asyncHandler(async (req, res) => {
  const { title, description, category, address, pincode, imageUrl } = req.body;

  if (!title || !description || !pincode) {
    return res.status(400).json({ message: 'Title, description, and pincode are required.' });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  const categoryMap = {
    'Roads': 'Roads & Potholes',
    'Roads & Potholes': 'Roads & Potholes',
    'Garbage': 'Sanitation & Garbage',
    'Sanitation & Garbage': 'Sanitation & Garbage',
    'Street Lighting': 'Street Lighting',
    'Lighting': 'Street Lighting',
    'Electricity': 'Electricity',
    'Water': 'Water Supply',
    'Water Supply': 'Water Supply',
    'Other': 'Other',
  };

  const resolvedCategory = categoryMap[category] || 'Other';
  const resolvedDepartment = mapCategoryToDepartment(resolvedCategory);

  const resolvedImageUrl = req.file
    ? getFileUrl(req.file)
    : (imageUrl ? imageUrl.trim() : '');

  const newIssue = new CivicIssue({
    title: title.trim(),
    description: description.trim(),
    category: resolvedCategory,
    department: resolvedDepartment,
    location: {
      address: address ? address.trim() : '',
      pincode: pincode.trim(),
    },
    imageUrl: resolvedImageUrl,
    reportedBy: req.user.id,
    statusHistory: [
      {
        status: 'Reported',
        changedBy: req.user.id,
        changedAt: new Date(),
        comment: 'Issue reported',
      },
    ],
  });

  const savedIssue = await newIssue.save();
  const populatedIssue = await savedIssue.populate('reportedBy', 'name');
  return res.status(201).json(populatedIssue);
});

// Helper to escape regex special characters
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// 2. Get All Civic Issues (With Pincode/Category/Department/Worker/Search/Priority Filters & Optional Pagination)
exports.getIssues = asyncHandler(async (req, res) => {
  const { pincode, category, status, department, assignedWorker, search, priority, page, limit } = req.query;
  let filter = {};

  if (pincode) filter['location.pincode'] = pincode;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (department !== undefined) {
    filter.department = department === 'null' ? null : department;
  }
  if (assignedWorker) filter.assignedWorker = assignedWorker;

  if (search && typeof search === 'string' && search.trim()) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  // Check if pagination was requested (either page or limit passed)
  const isPaginated = page !== undefined || limit !== undefined;

  if (isPaginated) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const rawLimit = parseInt(limit, 10) || 10;
    const limitNum = Math.min(50, Math.max(1, rawLimit));
    const skip = (pageNum - 1) * limitNum;

    const [total, data] = await Promise.all([
      CivicIssue.countDocuments(filter),
      CivicIssue.find(filter)
        .populate('reportedBy', 'name')
        .populate('assignedWorker', 'name department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  }

  // Backward compatibility: when neither page nor limit is passed, return plain array
  const issues = await CivicIssue.find(filter)
    .populate('reportedBy', 'name')
    .populate('assignedWorker', 'name department')
    .sort({ createdAt: -1 });

  return res.json(issues);
});

// 2a. Get My Reported Issues (Protected - Any logged-in user)
exports.getMyIssues = asyncHandler(async (req, res) => {
  const issues = await CivicIssue.find({ reportedBy: req.user.id })
    .populate('reportedBy', 'name')
    .populate('assignedWorker', 'name department')
    .sort({ createdAt: -1 });

  return res.json(issues);
});

// 2b. Get Assigned Issues (Worker Only)
exports.getAssignedIssues = asyncHandler(async (req, res) => {
  const issues = await CivicIssue.find({ assignedWorker: req.user.id })
    .populate('reportedBy', 'name')
    .populate('assignedWorker', 'name department')
    .sort({ createdAt: -1 });

  return res.json(issues);
});

// 2c. Get Single Issue by ID (Public)
exports.getIssueById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid issue ID format' });
  }

  const issue = await CivicIssue.findById(id)
    .populate('reportedBy', 'name')
    .populate('assignedWorker', 'name department')
    .populate('statusHistory.changedBy', 'name role');

  if (!issue) {
    return res.status(404).json({ message: 'Issue not found' });
  }

  return res.json(issue);
});

const UPVOTE_HIGH_PRIORITY_THRESHOLD = 10;
exports.UPVOTE_HIGH_PRIORITY_THRESHOLD = UPVOTE_HIGH_PRIORITY_THRESHOLD;

// 3. Upvote an Issue
exports.upvoteIssue = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  const issue = await CivicIssue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  // Check if user already upvoted
  if (issue.upvotes.includes(req.user.id)) {
    return res.status(400).json({ message: 'Issue already upvoted' });
  }

  issue.upvotes.push(req.user.id);

  // Escalate to High priority upon reaching threshold if currently Low or Medium
  if (
    issue.upvotes.length >= UPVOTE_HIGH_PRIORITY_THRESHOLD &&
    (issue.priority === 'Low' || issue.priority === 'Medium')
  ) {
    issue.priority = 'High';
    issue.statusHistory.push({
      status: issue.status,
      changedBy: req.user.id,
      changedAt: new Date(),
      comment: `Priority escalated to High upon reaching ${UPVOTE_HIGH_PRIORITY_THRESHOLD} upvotes`,
    });
  }

  await issue.save();

  return res.json({ message: 'Upvoted successfully', upvotes: issue.upvotes.length });
});

// 4. Update Issue Status & Priority (dept_admin, super_admin only)
exports.updateIssueStatus = asyncHandler(async (req, res) => {
  const { status, priority, comment } = req.body;

  const issue = await CivicIssue.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({ message: 'Issue not found' });
  }

  if (status && status !== issue.status) {
    issue.statusHistory.push({
      status,
      changedBy: req.user.id,
      changedAt: new Date(),
      comment: comment || `Status updated to ${status}`,
    });
    issue.status = status;
  }
  if (priority) issue.priority = priority;

  const savedIssue = await issue.save();
  const populatedIssue = await savedIssue.populate([
    { path: 'reportedBy', select: 'name' },
    { path: 'assignedWorker', select: 'name department' },
    { path: 'statusHistory.changedBy', select: 'name role' },
  ]);

  const issueObj = populatedIssue.toObject();
  return res.status(200).json({
    ...issueObj,
    issue: issueObj,
    message: 'Issue status updated successfully',
    success: true,
  });
});

// 5. Assign Worker to Issue (dept_admin, super_admin only)
exports.assignWorker = asyncHandler(async (req, res) => {
  const { workerId, comment } = req.body;

  if (!workerId) {
    return res.status(400).json({ message: 'workerId is required' });
  }

  const issue = await CivicIssue.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({ message: 'Issue not found' });
  }

  const worker = await User.findById(workerId);
  if (!worker || worker.role !== 'worker') {
    return res.status(400).json({ message: 'Assigned user must be a valid worker' });
  }

  issue.assignedWorker = worker._id;

  issue.statusHistory.push({
    status: issue.status,
    changedBy: req.user.id,
    changedAt: new Date(),
    comment: comment || `Assigned to worker ${worker.name}`,
  });

  const savedIssue = await issue.save();
  const populatedIssue = await savedIssue.populate([
    { path: 'reportedBy', select: 'name' },
    { path: 'assignedWorker', select: 'name department' },
    { path: 'statusHistory.changedBy', select: 'name role' },
  ]);

  const issueObj = populatedIssue.toObject();
  return res.status(200).json({
    ...issueObj,
    issue: issueObj,
    message: 'Worker assigned successfully',
    success: true,
  });
});

// 6. Resolve Issue with Proof Photo (worker, dept_admin, super_admin)
exports.resolveIssue = asyncHandler(async (req, res) => {
  const issue = await CivicIssue.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({ message: 'Issue not found' });
  }

  // Access check: worker, dept_admin, super_admin
  const isAuthorized =
    req.user.role === 'super_admin' ||
    req.user.role === 'dept_admin' ||
    req.user.role === 'worker';

  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to resolve issues' });
  }

  const proofImageUrl = req.file
    ? getFileUrl(req.file)
    : (req.body.proofImageUrl ? req.body.proofImageUrl.trim() : '');

  const notes = req.body.notes || req.body.comment || '';

  issue.status = 'Resolved';
  issue.resolutionDetails = {
    resolvedAt: new Date(),
    resolvedBy: req.user.id,
    proofImageUrl,
    notes,
  };

  issue.statusHistory.push({
    status: 'Resolved',
    changedBy: req.user.id,
    changedAt: new Date(),
    comment: notes ? `Resolved: ${notes}` : 'Issue marked as resolved with proof',
  });

  const savedIssue = await issue.save();
  const populatedIssue = await savedIssue.populate([
    { path: 'reportedBy', select: 'name' },
    { path: 'assignedWorker', select: 'name department' },
    { path: 'resolutionDetails.resolvedBy', select: 'name role' },
    { path: 'statusHistory.changedBy', select: 'name role' },
  ]);

  const issueObj = populatedIssue.toObject();
  return res.status(200).json({
    ...issueObj,
    issue: issueObj,
    message: 'Issue resolved successfully',
    success: true,
  });
});

// 5. Get Issue Aggregation Statistics (Admin only)
exports.getIssueStats = asyncHandler(async (req, res) => {
  const stats = await CivicIssue.aggregate([
    {
      $facet: {
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byCategoryAndStatus: [
          {
            $group: {
              _id: { category: '$category', status: '$status' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const result = stats[0] || {};
  const total = result.total && result.total[0] ? result.total[0].count : 0;

  return res.status(200).json({
    success: true,
    total,
    byCategory: result.byCategory || [],
    byStatus: result.byStatus || [],
    byPriority: result.byPriority || [],
    byCategoryAndStatus: result.byCategoryAndStatus || [],
  });
});
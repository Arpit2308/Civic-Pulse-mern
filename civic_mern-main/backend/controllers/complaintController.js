const ConsumerComplaint = require('../models/ConsumerComplaint');
const asyncHandler = require('../middleware/asyncHandler');
const { getFileUrl } = require('../utils/storage');

// 1. File New Consumer Complaint
exports.createComplaint = asyncHandler(async (req, res) => {
  const { brandName, storeName, productName, product, category, description, issueDetails, proofImageUrl } = req.body;

  const finalBrand = brandName || storeName;
  const finalProduct = productName || product;
  const finalDesc = description || issueDetails;

  if (!finalBrand || !finalProduct || !finalDesc) {
    return res.status(400).json({ message: 'Store/Brand name, Product name, and description are required.' });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  const resolvedProofImageUrl = req.file
    ? getFileUrl(req.file)
    : (proofImageUrl ? proofImageUrl.trim() : '');

  const newComplaint = new ConsumerComplaint({
    brandName: finalBrand.trim(),
    productName: finalProduct.trim(),
    category: category || 'Other',
    description: finalDesc.trim(),
    proofImageUrl: resolvedProofImageUrl,
    filedBy: req.user.id,
  });

  const savedComplaint = await newComplaint.save();
  return res.status(201).json(savedComplaint);
});

// 2. Get All Consumer Complaints (User specific ya Admin view)
exports.getComplaints = asyncHandler(async (req, res) => {
  let filter = {};
  
  // Agar normal citizen hai toh sirf apni complaints dekhega
  if (req.user && req.user.role === 'citizen') {
    filter.filedBy = req.user.id;
  }

  const complaints = await ConsumerComplaint.find(filter)
    .populate('filedBy', 'name email phone')
    .sort({ createdAt: -1 });

  return res.json(complaints);
});

// 3. Update Complaint Status (dept_admin, super_admin only)
exports.updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const complaint = await ConsumerComplaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }

  complaint.status = status;
  const savedComplaint = await complaint.save();
  const populatedComplaint = await savedComplaint.populate('filedBy', 'name email phone');

  const complaintObj = populatedComplaint.toObject();
  return res.status(200).json({
    ...complaintObj,
    complaint: complaintObj,
    message: 'Complaint status updated successfully',
    success: true,
  });
});

// 4. Get Consumer Complaint Aggregation Statistics (Admin only)
exports.getComplaintStats = asyncHandler(async (req, res) => {
  const stats = await ConsumerComplaint.aggregate([
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
    byCategoryAndStatus: result.byCategoryAndStatus || [],
  });
});
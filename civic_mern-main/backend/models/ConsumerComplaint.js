const mongoose = require('mongoose');

const consumerComplaintSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Adulterated Food', 'Defective Product', 'Billing Fraud', 'Unsafe Cosmetics', 'Other'],
    },
    description: {
      type: String,
      required: true,
    },
    proofImageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Escalated', 'Resolved', 'Rejected'],
      default: 'Submitted',
    },
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConsumerComplaint', consumerComplaintSchema);
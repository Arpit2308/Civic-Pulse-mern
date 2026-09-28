const mongoose = require('mongoose');

const civicIssueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Roads & Potholes', 'Sanitation & Garbage', 'Street Lighting', 'Water Supply', 'Electricity', 'Other'],
      default: 'Other',
    },
    location: {
      address: { type: String, default: '' },
      pincode: { type: String, required: true, trim: true },
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Reported', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Reported',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    department: {
      type: String,
      enum: ['Roads & Potholes', 'Sanitation & Garbage', 'Street Lighting', 'Water Supply', 'General'],
      default: 'General',
      trim: true,
    },
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['Reported', 'In Progress', 'Resolved', 'Rejected'],
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        comment: {
          type: String,
          default: '',
        },
      },
    ],
    resolutionDetails: {
      resolvedAt: {
        type: Date,
        default: null,
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      proofImageUrl: {
        type: String,
        default: '',
      },
      notes: {
        type: String,
        default: '',
      },
    },
    isSeed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CivicIssue', civicIssueSchema);
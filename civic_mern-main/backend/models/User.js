const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'worker', 'dept_admin', 'super_admin'],
      default: 'citizen',
    },
    department: {
      type: String,
      enum: ['Roads & Potholes', 'Sanitation & Garbage', 'Street Lighting', 'Water Supply', 'General', null],
      default: null,
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
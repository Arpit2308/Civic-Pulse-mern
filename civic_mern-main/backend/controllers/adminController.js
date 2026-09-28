const User = require('../models/User');
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

module.exports = {
  createWorker,
};

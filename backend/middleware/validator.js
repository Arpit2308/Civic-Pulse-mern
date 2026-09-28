const { body, param, validationResult } = require('express-validator');
const fs = require('fs');

// Reusable validation handler middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Clean up uploaded file if validation failed
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }

    const fieldErrors = {};
    const details = [];

    errors.array().forEach((err) => {
      const field = err.path || err.param;
      if (!fieldErrors[field]) {
        fieldErrors[field] = err.msg;
      }
      details.push({
        field,
        message: err.msg,
      });
    });

    const firstMessage = details[0]?.message || 'Validation error';

    return res.status(400).json({
      message: firstMessage,
      errors: fieldErrors,
      details,
    });
  };
};

// 1. User Registration Validation
const registerValidation = validate([
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
]);

// 2. User Login Validation
const loginValidation = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
]);

// 3. Create Civic Issue Validation
const createIssueValidation = validate([
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Title must be between 3 and 150 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 5 })
    .withMessage('Description must be at least 5 characters long'),
  body('pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required'),
  body('category')
    .optional({ checkFalsy: true })
    .trim(),
  body('address')
    .optional()
    .trim(),
  body('imageUrl')
    .optional()
    .trim(),
]);

// 4. Upvote Issue (PUT /api/issues/:id/upvote) Validation
const upvoteIssueValidation = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid issue ID format'),
]);

// 5. Create Consumer Complaint Validation
const createComplaintValidation = validate([
  body('brandName').custom((value, { req }) => {
    const brand = req.body.brandName || req.body.storeName;
    if (!brand || (typeof brand === 'string' && !brand.trim())) {
      throw new Error('Brand or store name is required');
    }
    return true;
  }),
  body('productName').custom((value, { req }) => {
    const product = req.body.productName || req.body.product;
    if (!product || (typeof product === 'string' && !product.trim())) {
      throw new Error('Product name is required');
    }
    return true;
  }),
  body('description').custom((value, { req }) => {
    const desc = req.body.description || req.body.issueDetails;
    if (!desc || (typeof desc === 'string' && !desc.trim())) {
      throw new Error('Description is required');
    }
    return true;
  }),
  body('category')
    .optional({ checkFalsy: true })
    .trim(),
  body('proofImageUrl')
    .optional()
    .trim(),
]);

// 6. Update Issue Status / Priority Validation (PUT /api/issues/:id/status)
const updateIssueStatusValidation = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid issue ID format'),
  body('status')
    .optional()
    .isIn(['Reported', 'In Progress', 'Resolved', 'Rejected'])
    .withMessage('Status must be one of: Reported, In Progress, Resolved, Rejected'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be one of: Low, Medium, High'),
  body().custom((value, { req }) => {
    if (!req.body.status && !req.body.priority) {
      throw new Error('At least status or priority must be provided');
    }
    return true;
  }),
]);

// 7. Update Complaint Status Validation (PUT /api/complaints/:id/status)
const updateComplaintStatusValidation = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid complaint ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['Submitted', 'Under Review', 'Escalated', 'Resolved', 'Rejected'])
    .withMessage('Status must be one of: Submitted, Under Review, Escalated, Resolved, Rejected'),
]);

// 8. Update User Role Validation (PATCH /api/auth/users/:id/role)
const updateUserRoleValidation = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['citizen', 'worker', 'dept_admin', 'super_admin'])
    .withMessage('Role must be one of: citizen, worker, dept_admin, super_admin'),
  body('department')
    .optional({ nullable: true })
    .trim(),
]);

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createIssueValidation,
  upvoteIssueValidation,
  createComplaintValidation,
  updateIssueStatusValidation,
  updateComplaintStatusValidation,
  updateUserRoleValidation,
};

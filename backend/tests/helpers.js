const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Register a user via the API and return the response body.
 */
async function registerUser(overrides = {}) {
  const defaults = {
    name: 'Test User',
    email: `testuser_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Password@123',
  };
  const data = { ...defaults, ...overrides };
  const res = await request(app).post('/api/auth/register').send(data);
  return { res, data };
}

/**
 * Login a user via the API and return the token.
 */
async function loginUser(email, password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { res, token: res.body.token };
}

/**
 * Register + login in one call. Returns { token, userId, email, res }.
 */
async function createAuthenticatedUser(overrides = {}) {
  const { res: regRes, data } = await registerUser(overrides);
  const { res: loginRes, token } = await loginUser(data.email, data.password);
  return {
    token,
    userId: loginRes.body.user?.id,
    email: data.email,
    password: data.password,
    name: data.name || overrides.name || 'Test User',
    regRes,
    loginRes,
  };
}

/**
 * Directly set a user's role in the database (bypasses the API).
 * Useful for promoting to super_admin/dept_admin in tests.
 */
async function setUserRole(userId, role) {
  await User.findByIdAndUpdate(userId, { role });
}

/**
 * Create a user with a specific role, returns { token, userId }.
 */
async function createUserWithRole(role, overrides = {}) {
  const user = await createAuthenticatedUser(overrides);
  const updateData = {};
  if (role !== 'citizen') updateData.role = role;
  if (overrides.department !== undefined) updateData.department = overrides.department;
  if (overrides.phone !== undefined) updateData.phone = overrides.phone;
  if (overrides.pincode !== undefined) updateData.pincode = overrides.pincode;

  if (Object.keys(updateData).length > 0) {
    await User.findByIdAndUpdate(user.userId, updateData);
  }

  if (role !== 'citizen') {
    // Re-login to get a token with the correct role claim
    const { token } = await loginUser(user.email, user.password);
    return { ...user, token };
  }
  return user;
}

module.exports = {
  app,
  request,
  registerUser,
  loginUser,
  createAuthenticatedUser,
  setUserRole,
  createUserWithRole,
};

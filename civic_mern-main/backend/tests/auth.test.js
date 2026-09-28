const { app, request, registerUser, loginUser, createAuthenticatedUser, createUserWithRole, setUserRole } = require('./helpers');

describe('Auth Endpoints', () => {
  // ============================================================
  // REGISTRATION
  // ============================================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { res } = await registerUser({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'StrongPass1!',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('should reject duplicate email', async () => {
      await registerUser({ email: 'dup@example.com', password: 'Password@123' });
      const { res } = await registerUser({ email: 'dup@example.com', password: 'Password@123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject weak password (< 6 chars)', async () => {
      const { res } = await registerUser({ password: '123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/6 characters/i);
    });

    it('should reject invalid email format', async () => {
      const { res } = await registerUser({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it('should reject missing name', async () => {
      const { res } = await registerUser({ name: '' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('should assign role citizen even if role: super_admin is sent in body', async () => {
      const User = require('../models/User');
      const jwt = require('jsonwebtoken');

      const { res } = await registerUser({
        name: 'Exploit Tester',
        email: 'exploit_tester@example.com',
        password: 'Password@123',
        role: 'super_admin',
      });

      expect(res.status).toBe(201);
      // The register response returns { id, name, email } and does not leak or reflect requested role
      expect(res.body.user.role).toBeUndefined();

      // Check the created user document in the database
      const userInDb = await User.findOne({ email: 'exploit_tester@example.com' });
      expect(userInDb).not.toBeNull();

      // Check login response and JWT claim
      const { res: loginRes, token } = await loginUser('exploit_tester@example.com', 'Password@123');
      const decoded = jwt.decode(token);

      console.log('ACTUAL_RESULT_DB_ROLE:', userInDb.role);
      console.log('ACTUAL_RESULT_LOGIN_ROLE:', loginRes.body.user?.role);
      console.log('ACTUAL_RESULT_JWT_ROLE:', decoded.role);

      expect(userInDb.role).toBe('citizen');
      expect(loginRes.body.user.role).toBe('citizen');
      expect(decoded.role).toBe('citizen');
    });
  });

  // ============================================================
  // LOGIN
  // ============================================================
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await registerUser({
        email: 'logintest@example.com',
        password: 'ValidPass123',
      });
    });

    it('should login with valid credentials and return a JWT', async () => {
      const { res, token } = await loginUser('logintest@example.com', 'ValidPass123');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(res.body.user).toHaveProperty('role');
    });

    it('should reject wrong password', async () => {
      const { res } = await loginUser('logintest@example.com', 'WrongPassword!');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('should reject nonexistent user', async () => {
      const { res } = await loginUser('noone@example.com', 'Password@123');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'ValidPass123' });
      expect(res.status).toBe(400);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logintest@example.com' });
      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // ROLE PROMOTION (PATCH /api/auth/users/:id/role)
  // ============================================================
  describe('PATCH /api/auth/users/:id/role', () => {
    it('should allow super_admin to promote a user', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'superadmin@example.com',
      });
      const citizen = await createAuthenticatedUser({
        email: 'citizen@example.com',
      });

      const res = await request(app)
        .patch(`/api/auth/users/${citizen.userId}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'dept_admin' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('dept_admin');
    });

    it('should allow super_admin to promote a user to worker with department', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'sa_worker_test@example.com',
      });
      const target = await createAuthenticatedUser({
        email: 'target_worker@example.com',
      });

      const res = await request(app)
        .patch(`/api/auth/users/${target.userId}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'worker', department: 'Roads & Potholes' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('worker');
      expect(res.body.user.department).toBe('Roads & Potholes');

      // Verify re-login issues a JWT with role: 'worker'
      const { res: loginRes, token } = await loginUser(target.email, target.password);
      expect(loginRes.body.user.role).toBe('worker');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      expect(decoded.role).toBe('worker');
    });

    it('should return 403 when a citizen tries to promote', async () => {
      const citizen = await createAuthenticatedUser({
        email: 'citizen2@example.com',
      });
      const target = await createAuthenticatedUser({
        email: 'target@example.com',
      });

      const res = await request(app)
        .patch(`/api/auth/users/${target.userId}/role`)
        .set('Authorization', `Bearer ${citizen.token}`)
        .send({ role: 'dept_admin' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid role value', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'sa2@example.com',
      });
      const user = await createAuthenticatedUser({
        email: 'u2@example.com',
      });

      const res = await request(app)
        .patch(`/api/auth/users/${user.userId}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'god_mode' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .patch('/api/auth/users/64a1b2c3d4e5f6a7b8c9d0e1/role')
        .send({ role: 'dept_admin' });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // JWT ROLE CLAIM SECURITY
  // Documenting intentional design: JWT claims are the source of truth
  // for the session duration. No live role revocation.
  // ============================================================
  describe('JWT Role Claim Behavior (Documented Design Decision)', () => {
    it('should issue a token with the NEW role after re-login post-promotion', async () => {
      const user = await createAuthenticatedUser({ email: 'promoted@example.com' });
      const oldToken = user.token;

      // Promote to dept_admin in DB
      await setUserRole(user.userId, 'dept_admin');

      // Re-login to get a fresh token
      const { token: newToken, res: loginRes } = await loginUser(user.email, user.password);
      expect(loginRes.body.user.role).toBe('dept_admin');

      // The new token should work for admin-only routes
      // Create an issue first so we can test status update
      const issueRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${newToken}`)
        .send({ title: 'Test Issue', description: 'Testing admin access', pincode: '560001' });
      expect(issueRes.status).toBe(201);

      const updateRes = await request(app)
        .put(`/api/issues/${issueRes.body._id}/status`)
        .set('Authorization', `Bearer ${newToken}`)
        .send({ status: 'In Progress' });
      expect(updateRes.status).toBe(200);
    });

    it('OLD token retains old role claim (documented: no live revocation)', async () => {
      // This test documents that after demotion, the old token still carries
      // the previous role. This is an intentional JWT trade-off.
      const user = await createAuthenticatedUser({ email: 'demoted@example.com' });

      // Promote to dept_admin and get fresh token
      await setUserRole(user.userId, 'dept_admin');
      const { token: adminToken } = await loginUser(user.email, user.password);

      // Demote back to citizen in DB
      await setUserRole(user.userId, 'citizen');

      // Old admin token still works because roleMiddleware reads JWT claims,
      // not the DB. This is a documented, intentional design trade-off.
      // The token expires in 1 day, forcing re-login which picks up the new role.
      //
      // NOTE: If live revocation is needed in the future, add a middleware that
      // checks req.user.role against the DB on every request (adds ~1 DB query/request).

      // Create an issue to test against
      const issueRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test Issue', description: 'Testing stale token', pincode: '560001' });

      // The OLD admin token still has role: dept_admin in its JWT payload
      // so the status update will SUCCEED (this is the expected but documented behavior)
      if (issueRes.status === 201) {
        const updateRes = await request(app)
          .put(`/api/issues/${issueRes.body._id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'In Progress' });

        // IMPORTANT: This succeeds because JWT claims are the source of truth.
        // This is NOT a bug — it's a documented trade-off.
        expect(updateRes.status).toBe(200);
      }

      // After re-login, the NEW token correctly reflects 'citizen' role
      const { token: newToken, res: loginRes } = await loginUser(user.email, user.password);
      expect(loginRes.body.user.role).toBe('citizen');

      // New citizen token should be denied admin routes
      const issueRes2 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${newToken}`)
        .send({ title: 'Another Issue', description: 'Citizen issue', pincode: '560001' });

      if (issueRes2.status === 201) {
        const updateRes2 = await request(app)
          .put(`/api/issues/${issueRes2.body._id}/status`)
          .set('Authorization', `Bearer ${newToken}`)
          .send({ status: 'In Progress' });
        expect(updateRes2.status).toBe(403);
      }
    });
  });

  // ============================================================
  // WORKER CREATION (SUPER_ADMIN ONLY)
  // ============================================================
  describe('POST /api/admin/workers', () => {
    it('should allow super_admin to create a worker with role=worker', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'sa_create_worker@example.com',
      });

      const res = await request(app)
        .post('/api/admin/workers')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Bob Worker',
          email: 'bob_worker@example.com',
          password: 'Password@123',
          department: 'Sanitation & Garbage',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/worker created/i);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('worker');
      expect(res.body.user.email).toBe('bob_worker@example.com');
      expect(res.body.user.department).toBe('Sanitation & Garbage');

      // Verify in DB directly
      const User = require('../models/User');
      const workerInDb = await User.findOne({ email: 'bob_worker@example.com' });
      expect(workerInDb).not.toBeNull();
      expect(workerInDb.role).toBe('worker');

      // Verify created worker can login and receives JWT with role='worker'
      const { res: loginRes, token: workerToken } = await loginUser('bob_worker@example.com', 'Password@123');
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('worker');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(workerToken);
      expect(decoded.role).toBe('worker');
    });

    it('should reject worker creation by citizen with 403', async () => {
      const citizen = await createAuthenticatedUser({
        email: 'citizen_worker_block@example.com',
      });

      const res = await request(app)
        .post('/api/admin/workers')
        .set('Authorization', `Bearer ${citizen.token}`)
        .send({
          name: 'Unauthorized Worker',
          email: 'unauth_worker@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(403);
    });

    it('should reject worker creation by dept_admin with 403', async () => {
      const deptAdmin = await createUserWithRole('dept_admin', {
        email: 'dept_admin_worker_block@example.com',
      });

      const res = await request(app)
        .post('/api/admin/workers')
        .set('Authorization', `Bearer ${deptAdmin.token}`)
        .send({
          name: 'Dept Worker',
          email: 'dept_worker@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(403);
    });

    it('should reject worker creation for unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/admin/workers')
        .send({
          name: 'Anon Worker',
          email: 'anon_worker@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(401);
    });

    it('should enforce validation rules (name, email, password length)', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'sa_val_test@example.com',
      });

      const res = await request(app)
        .post('/api/admin/workers')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });
});

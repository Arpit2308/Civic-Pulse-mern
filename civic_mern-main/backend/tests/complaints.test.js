const { app, request, createAuthenticatedUser, createUserWithRole } = require('./helpers');
const mongoose = require('mongoose');

describe('Complaints Endpoints', () => {
  let citizenToken, citizenId;

  beforeEach(async () => {
    const citizen = await createAuthenticatedUser({
      email: 'complaintuser@example.com',
    });
    citizenToken = citizen.token;
    citizenId = citizen.userId;
  });

  // ============================================================
  // CREATE COMPLAINT
  // ============================================================
  describe('POST /api/complaints', () => {
    it('should create a complaint with valid data', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'FakeBrand',
          productName: 'FakeProduct',
          category: 'Defective Product',
          description: 'Product broke after 1 day of use',
        });

      expect(res.status).toBe(201);
      expect(res.body.brandName).toBe('FakeBrand');
      expect(res.body.productName).toBe('FakeProduct');
      expect(res.body.status).toBe('Submitted');
    });

    it('should accept alternative field names (storeName, product, issueDetails)', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          storeName: 'AltStore',
          product: 'AltProduct',
          issueDetails: 'Alternative fields used',
          category: 'Other',
        });

      // The controller maps storeName -> brandName, product -> productName, issueDetails -> description
      expect(res.status).toBe(201);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ brandName: 'Only brand' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .send({
          brandName: 'SomeBrand',
          productName: 'SomeProduct',
          description: 'Should fail',
        });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // LIST COMPLAINTS
  // ============================================================
  describe('GET /api/complaints', () => {
    it('should list complaints for authenticated user', async () => {
      // Create a complaint
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'Brand1',
          productName: 'Product1',
          description: 'Description 1',
          category: 'Other',
        });

      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/complaints');
      expect(res.status).toBe(401);
    });

    it('citizen should only see own complaints', async () => {
      // Create complaint as citizen1
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'Brand1',
          productName: 'Product1',
          description: 'Citizen 1 complaint',
          category: 'Other',
        });

      // Create another citizen
      const citizen2 = await createAuthenticatedUser({
        email: 'citizen2@example.com',
      });

      // citizen2 should see empty list (not citizen1's complaint)
      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${citizen2.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });

    it('admin should see all complaints', async () => {
      // Create complaints from two different citizens
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'Brand1',
          productName: 'Product1',
          description: 'Citizen 1',
          category: 'Other',
        });

      const citizen2 = await createAuthenticatedUser({
        email: 'citizen2@example.com',
      });
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizen2.token}`)
        .send({
          brandName: 'Brand2',
          productName: 'Product2',
          description: 'Citizen 2',
          category: 'Other',
        });

      // Admin should see both
      const admin = await createUserWithRole('dept_admin', {
        email: 'admin_list@example.com',
      });

      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  // ============================================================
  // STATUS UPDATE (RBAC)
  // ============================================================
  describe('PUT /api/complaints/:id/status', () => {
    let complaintId;

    beforeEach(async () => {
      const compRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'TestBrand',
          productName: 'TestProduct',
          description: 'Test complaint for status update',
          category: 'Defective Product',
        });
      complaintId = compRes.body._id;
    });

    it('should allow dept_admin to update status', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da_comp@example.com',
      });

      const res = await request(app)
        .put(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Under Review' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Under Review');
    });

    it('should allow super_admin to update status', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'sa_comp@example.com',
      });

      const res = await request(app)
        .put(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Escalated' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Escalated');
    });

    it('should return 403 for citizen', async () => {
      const res = await request(app)
        .put(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'Resolved' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid status enum', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da_comp2@example.com',
      });

      const res = await request(app)
        .put(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'InvalidStatus' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing status', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da_comp3@example.com',
      });

      const res = await request(app)
        .put(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da_comp4@example.com',
      });

      const res = await request(app)
        .put('/api/complaints/not-valid-id/status')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Resolved' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for nonexistent complaint', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da_comp5@example.com',
      });
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/complaints/${fakeId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Resolved' });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // STATS (RBAC)
  // ============================================================
  describe('GET /api/complaints/stats', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'StatBrand1',
          productName: 'StatProd1',
          description: 'Stat complaint 1',
          category: 'Defective Product',
        });
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          brandName: 'StatBrand2',
          productName: 'StatProd2',
          description: 'Stat complaint 2',
          category: 'Billing Fraud',
        });
    });

    it('should return stats for dept_admin', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'statscomp_da@example.com',
      });

      const res = await request(app)
        .get('/api/complaints/stats')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(2);
      expect(Array.isArray(res.body.byCategory)).toBe(true);
    });

    it('should return 403 for citizen', async () => {
      const res = await request(app)
        .get('/api/complaints/stats')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/complaints/stats');
      expect(res.status).toBe(401);
    });
  });
});

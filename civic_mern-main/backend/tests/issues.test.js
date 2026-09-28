const { app, request, createAuthenticatedUser, createUserWithRole } = require('./helpers');
const mongoose = require('mongoose');

describe('Issues Endpoints', () => {
  let citizenToken, citizenId;

  beforeEach(async () => {
    const citizen = await createAuthenticatedUser({
      email: 'issueuser@example.com',
    });
    citizenToken = citizen.token;
    citizenId = citizen.userId;
  });

  // ============================================================
  // CREATE ISSUE
  // ============================================================
  describe('POST /api/issues', () => {
    it('should create an issue with valid data', async () => {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Broken Road',
          description: 'Large pothole on MG Road near bus stop',
          pincode: '560001',
          category: 'Roads',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Broken Road');
      expect(res.body.category).toBe('Roads & Potholes'); // category mapping
      expect(res.body.location.pincode).toBe('560001');
      expect(res.body.reportedBy).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Only title' });

      expect(res.status).toBe(400);
    });

    it('should reject missing title', async () => {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ description: 'No title here', pincode: '560001' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/issues')
        .send({
          title: 'Should fail',
          description: 'No auth token',
          pincode: '560001',
        });

      expect(res.status).toBe(401);
    });

    it('should default category to Other for unknown categories', async () => {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Unknown Category Issue',
          description: 'Some issue with unknown category',
          pincode: '560001',
          category: 'Alien Invasion',
        });

      expect(res.status).toBe(201);
      expect(res.body.category).toBe('Other');
    });
  });

  // ============================================================
  // LIST ISSUES WITH FILTERS
  // ============================================================
  describe('GET /api/issues', () => {
    beforeEach(async () => {
      // Create a few issues
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue A', description: 'Description A', pincode: '560001', category: 'Roads' });
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue B', description: 'Description B', pincode: '560002', category: 'Water' });
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue C', description: 'Description C', pincode: '560001', category: 'Water' });
    });

    it('should list all issues (public, no auth needed)', async () => {
      const res = await request(app).get('/api/issues');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
    });

    it('should filter by pincode', async () => {
      const res = await request(app).get('/api/issues?pincode=560001');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      res.body.forEach((issue) => {
        expect(issue.location.pincode).toBe('560001');
      });
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/issues?category=Water Supply');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/issues?status=Reported');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3); // all default to Reported
    });

    it('should return empty for non-matching filter', async () => {
      const res = await request(app).get('/api/issues?pincode=999999');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });
  });

  // ============================================================
  // UPVOTE
  // ============================================================
  describe('PUT /api/issues/:id/upvote', () => {
    let issueId;

    beforeEach(async () => {
      const issueRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Upvote Test', description: 'Test upvoting', pincode: '560001' });
      issueId = issueRes.body._id;
    });

    it('should upvote an issue successfully', async () => {
      const res = await request(app)
        .put(`/api/issues/${issueId}/upvote`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upvotes).toBe(1);
    });

    it('should reject duplicate upvote from same user', async () => {
      await request(app)
        .put(`/api/issues/${issueId}/upvote`)
        .set('Authorization', `Bearer ${citizenToken}`);

      const res = await request(app)
        .put(`/api/issues/${issueId}/upvote`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already upvoted/i);
    });

    it('should reject upvote with invalid ObjectId', async () => {
      const res = await request(app)
        .put('/api/issues/not-a-valid-id/upvote')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject unauthenticated upvote', async () => {
      const res = await request(app)
        .put(`/api/issues/${issueId}/upvote`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for nonexistent issue', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/issues/${fakeId}/upvote`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // STATUS UPDATE (RBAC)
  // ============================================================
  describe('PUT /api/issues/:id/status', () => {
    let issueId;

    beforeEach(async () => {
      const issueRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Status Test', description: 'Test status update', pincode: '560001' });
      issueId = issueRes.body._id;
    });

    it('should allow dept_admin to update status', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'deptadmin@example.com',
      });

      const res = await request(app)
        .put(`/api/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'In Progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('In Progress');
    });

    it('should allow super_admin to update status', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'superadmin@example.com',
      });

      const res = await request(app)
        .put(`/api/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Resolved', priority: 'High' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Resolved');
      expect(res.body.priority).toBe('High');
    });

    it('should return 403 for citizen trying to update status', async () => {
      const res = await request(app)
        .put(`/api/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'Resolved' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid status enum value', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da2@example.com',
      });

      const res = await request(app)
        .put(`/api/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Banana' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid priority enum value', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da3@example.com',
      });

      const res = await request(app)
        .put(`/api/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ priority: 'Ultra' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when neither status nor priority provided', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da4@example.com',
      });

      const res = await request(app)
        .put(`/api/issues/${issueId}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'da5@example.com',
      });

      const res = await request(app)
        .put('/api/issues/not-valid/status')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'Resolved' });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // STATS (RBAC)
  // ============================================================
  describe('GET /api/issues/stats', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Stat Issue 1', description: 'Desc 1', pincode: '560001', category: 'Roads' });
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Stat Issue 2', description: 'Desc 2', pincode: '560002', category: 'Water' });
    });

    it('should return stats for dept_admin', async () => {
      const admin = await createUserWithRole('dept_admin', {
        email: 'statsadmin@example.com',
      });

      const res = await request(app)
        .get('/api/issues/stats')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(2);
      expect(Array.isArray(res.body.byCategory)).toBe(true);
      expect(Array.isArray(res.body.byStatus)).toBe(true);
    });

    it('should return stats for super_admin', async () => {
      const admin = await createUserWithRole('super_admin', {
        email: 'sa_stats@example.com',
      });

      const res = await request(app)
        .get('/api/issues/stats')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
    });

    it('should return 403 for citizen', async () => {
      const res = await request(app)
        .get('/api/issues/stats')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/issues/stats');
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // DEPARTMENT MAPPING & STATUSHISTORY (PHASE 8 TASKS 2 & 3)
  // ============================================================
  describe('Department Mapping & statusHistory tracking', () => {
    it('should map categories to the 4 departments and map Other to General catch-all', async () => {
      // 1. Roads -> Roads & Potholes
      const resRoads = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Road Issue', description: 'Road pothole details', pincode: '560001', category: 'Roads' });
      expect(resRoads.status).toBe(201);
      expect(resRoads.body.department).toBe('Roads & Potholes');

      // 2. Garbage -> Sanitation & Garbage
      const resGarbage = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Garbage Issue', description: 'Garbage pile details', pincode: '560001', category: 'Garbage' });
      expect(resGarbage.status).toBe(201);
      expect(resGarbage.body.department).toBe('Sanitation & Garbage');

      // 3. Street Lighting -> Street Lighting
      const resLight = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Light Issue', description: 'Street light broken', pincode: '560001', category: 'Street Lighting' });
      expect(resLight.status).toBe(201);
      expect(resLight.body.department).toBe('Street Lighting');

      // 4. Water -> Water Supply
      const resWater = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Water Issue', description: 'Water pipe leaking', pincode: '560001', category: 'Water' });
      expect(resWater.status).toBe(201);
      expect(resWater.body.department).toBe('Water Supply');

      // 5. Other -> General catch-all department
      const resOther = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Other Issue', description: 'Uncategorized civic issue', pincode: '560001', category: 'Other' });
      expect(resOther.status).toBe(201);
      expect(resOther.body.department).toBe('General');
    });

    it('should include initial statusHistory entry at creation time (Task 3)', async () => {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'History Check', description: 'Checking initial history', pincode: '560001', category: 'Roads' });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.statusHistory)).toBe(true);
      expect(res.body.statusHistory.length).toBe(1);
      expect(res.body.statusHistory[0].status).toBe('Reported');
      expect(res.body.statusHistory[0].changedBy).toBe(citizenId);
    });

    it('should append to statusHistory when status is updated', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Update History Check', description: 'Checking update history', pincode: '560001' });

      const admin = await createUserWithRole('dept_admin', { email: 'history_admin@example.com' });

      const updateRes = await request(app)
        .put(`/api/issues/${createRes.body._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'In Progress', comment: 'Work starting soon' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.statusHistory.length).toBe(2);
      expect(updateRes.body.statusHistory[1].status).toBe('In Progress');
      expect(updateRes.body.statusHistory[1].comment).toBe('Work starting soon');
    });
  });

  // ============================================================
  // WORKER ASSIGNMENT (TASK 2)
  // ============================================================
  describe('PATCH /api/issues/:id/assign', () => {
    it('should allow dept_admin to assign a worker to an issue', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Pothole for Worker', description: 'To be assigned', pincode: '560001', category: 'Roads' });

      const admin = await createUserWithRole('dept_admin', { email: 'assign_admin@example.com' });
      const worker = await createUserWithRole('worker', { email: 'assigned_worker@example.com' });

      const res = await request(app)
        .patch(`/api/issues/${createRes.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: worker.userId, comment: 'Assigning to road maintenance crew' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.issue.assignedWorker).toBeDefined();
      expect(res.body.issue.assignedWorker._id).toBe(worker.userId);
      expect(res.body.issue.status).toBe('Reported'); // status is preserved, not auto-transitioned
      expect(res.body.issue.statusHistory.length).toBe(2);
    });

    it('should reject worker assignment from a citizen with 403', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue for Citizen', description: 'No assignment rights', pincode: '560001' });

      const worker = await createUserWithRole('worker', { email: 'target_w@example.com' });

      const res = await request(app)
        .patch(`/api/issues/${createRes.body._id}/assign`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ workerId: worker.userId });

      expect(res.status).toBe(403);
    });

    it('should reject assigning a non-worker user with 400', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue invalid worker', description: 'Checking role validation', pincode: '560001' });

      const admin = await createUserWithRole('dept_admin', { email: 'assign_ad2@example.com' });
      const regularUser = await createAuthenticatedUser({ email: 'not_a_worker@example.com' });

      const res = await request(app)
        .patch(`/api/issues/${createRes.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: regularUser.userId });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid worker/i);
    });
  });

  // ============================================================
  // RESOLVE ISSUE WITH PROOF PHOTO (TASK 4)
  // ============================================================
  describe('PUT /api/issues/:id/resolve', () => {
    it('should allow worker to resolve issue with proof photo', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue to Resolve', description: 'Fixing pothole', pincode: '560001', category: 'Roads' });

      const worker = await createUserWithRole('worker', { email: 'resolving_worker@example.com' });

      // Valid 1x1 PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .put(`/api/issues/${createRes.body._id}/resolve`)
        .set('Authorization', `Bearer ${worker.token}`)
        .field('notes', 'Pothole asphalt patched and sealed')
        .attach('proofImage', pngBuffer, 'proof.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.issue.status).toBe('Resolved');
      expect(res.body.issue.resolutionDetails.proofImageUrl).toMatch(/^\/uploads\//);
      expect(res.body.issue.resolutionDetails.notes).toBe('Pothole asphalt patched and sealed');
      expect(res.body.issue.statusHistory.length).toBe(2);
      expect(res.body.issue.statusHistory[1].status).toBe('Resolved');
    });

    it('should reject spoofed image upload on resolve endpoint (Task 4 magic-byte validation)', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Issue for Spoofed Resolve', description: 'Testing magic bytes', pincode: '560001' });

      const worker = await createUserWithRole('worker', { email: 'resolving_worker2@example.com' });

      // Spoofed text file pretending to be PNG
      const fakePngBuffer = Buffer.from('NOT A REAL PNG FILE - PLAIN TEXT EXPLOIT');

      const res = await request(app)
        .put(`/api/issues/${createRes.body._id}/resolve`)
        .set('Authorization', `Bearer ${worker.token}`)
        .field('notes', 'Should fail due to magic byte inspection')
        .attach('proofImage', fakePngBuffer, { filename: 'malicious.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/corrupted|invalid|does not match/i);
    });

    it('should reject resolve request from a citizen with 403', async () => {
      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Citizen resolve block', description: 'Testing auth check', pincode: '560001' });

      const res = await request(app)
        .put(`/api/issues/${createRes.body._id}/resolve`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ notes: 'Trying to resolve without permission' });

      expect(res.status).toBe(403);
    });
  });
});

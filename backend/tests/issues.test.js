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

    it('should escalate priority to High and append statusHistory entry when issue reaches 10 upvotes (Task 8)', async () => {
      const CivicIssue = require('../models/CivicIssue');
      // Seed 9 fake upvotes
      const fakeUpvotes = Array.from({ length: 9 }, () => new mongoose.Types.ObjectId());
      await CivicIssue.findByIdAndUpdate(issueId, { upvotes: fakeUpvotes, priority: 'Medium' });

      // Cast 10th upvote
      const res = await request(app)
        .put(`/api/issues/${issueId}/upvote`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upvotes).toBe(10);

      const updatedIssue = await CivicIssue.findById(issueId);
      expect(updatedIssue.priority).toBe('High');
      const latestHistory = updatedIssue.statusHistory[updatedIssue.statusHistory.length - 1];
      expect(latestHistory.comment).toMatch(/10 upvotes/i);
      expect(latestHistory.changedBy.toString()).toBe(citizenId);
    });

    it('should not push extra statusHistory entry if already High priority when reaching 10 upvotes', async () => {
      const CivicIssue = require('../models/CivicIssue');
      const fakeUpvotes = Array.from({ length: 9 }, () => new mongoose.Types.ObjectId());
      await CivicIssue.findByIdAndUpdate(issueId, { upvotes: fakeUpvotes, priority: 'High' });

      const issueBefore = await CivicIssue.findById(issueId);
      const historyLengthBefore = issueBefore.statusHistory.length;

      const res = await request(app)
        .put(`/api/issues/${issueId}/upvote`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upvotes).toBe(10);

      const updatedIssue = await CivicIssue.findById(issueId);
      expect(updatedIssue.priority).toBe('High');
      expect(updatedIssue.statusHistory.length).toBe(historyLengthBefore);
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

  // ============================================================
  // GET MY REPORTED ISSUES (TASK 2: GET /api/issues/my)
  // ============================================================
  describe('GET /api/issues/my', () => {
    it('should list only issues reported by current user, newest first', async () => {
      // Citizen 1 creates 2 issues
      const issue1 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'My First Issue', description: 'Desc 1', pincode: '560001', category: 'Roads' });

      const issue2 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'My Second Issue', description: 'Desc 2', pincode: '560001', category: 'Water' });

      // Other citizen creates 1 issue
      const otherCitizen = await createAuthenticatedUser({ email: 'other_reporter@example.com' });
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${otherCitizen.token}`)
        .send({ title: 'Other Issue', description: 'Other desc', pincode: '560001' });

      const res = await request(app)
        .get('/api/issues/my')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]._id).toBe(issue2.body._id); // Newest first
      expect(res.body[1]._id).toBe(issue1.body._id);
      expect(res.body[0].reportedBy.name).toBeDefined();
      expect(res.body[0].reportedBy.email).toBeUndefined(); // Privacy check
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/issues/my');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token/i);
    });
  });

  // ============================================================
  // GET ASSIGNED ISSUES (TASK 2: GET /api/issues/assigned)
  // ============================================================
  describe('GET /api/issues/assigned', () => {
    it('should list only issues assigned to current worker, newest first', async () => {
      const admin = await createUserWithRole('dept_admin', { email: 'assign_admin_test@example.com' });
      const worker = await createUserWithRole('worker', { email: 'assigned_worker_test@example.com' });
      const otherWorker = await createUserWithRole('worker', { email: 'assigned_worker_other@example.com' });

      // Create 2 issues and assign to worker
      const issue1 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Task 1 for Worker', description: 'Fix pipe', pincode: '560001' });

      const issue2 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Task 2 for Worker', description: 'Fix light', pincode: '560001' });

      // Create issue assigned to otherWorker
      const issue3 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Task for Other Worker', description: 'Fix road', pincode: '560001' });

      await request(app)
        .patch(`/api/issues/${issue1.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: worker.userId });

      await request(app)
        .patch(`/api/issues/${issue2.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: worker.userId });

      await request(app)
        .patch(`/api/issues/${issue3.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: otherWorker.userId });

      const res = await request(app)
        .get('/api/issues/assigned')
        .set('Authorization', `Bearer ${worker.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]._id).toBe(issue2.body._id); // Newest first
      expect(res.body[1]._id).toBe(issue1.body._id);
      expect(res.body[0].assignedWorker._id).toBe(worker.userId);
      expect(res.body[0].reportedBy.email).toBeUndefined(); // Privacy check
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/issues/assigned');
      expect(res.status).toBe(401);
    });

    it('should reject non-worker role (citizen) with 403', async () => {
      const res = await request(app)
        .get('/api/issues/assigned')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject non-worker role (dept_admin) with 403', async () => {
      const admin = await createUserWithRole('dept_admin', { email: 'admin_block@example.com' });
      const res = await request(app)
        .get('/api/issues/assigned')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // GET SINGLE ISSUE BY ID (TASK 3: GET /api/issues/:id)
  // ============================================================
  describe('GET /api/issues/:id', () => {
    it('should return issue by id with populated reportedBy, assignedWorker, statusHistory.changedBy', async () => {
      const admin = await createUserWithRole('dept_admin', { email: 'admin_detail@example.com' });
      const worker = await createUserWithRole('worker', {
        email: 'worker_detail@example.com',
        department: 'Roads & Potholes',
      });

      const createRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Single Issue Test', description: 'Detail check', pincode: '560001', category: 'Roads' });

      // Assign worker so assignedWorker and statusHistory are populated
      await request(app)
        .patch(`/api/issues/${createRes.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: worker.userId, comment: 'Assigned for testing' });

      const res = await request(app).get(`/api/issues/${createRes.body._id}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(createRes.body._id);
      expect(res.body.title).toBe('Single Issue Test');

      // Check reportedBy: name only, no email
      expect(res.body.reportedBy).toBeDefined();
      expect(res.body.reportedBy.name).toBeDefined();
      expect(res.body.reportedBy.email).toBeUndefined();

      // Check assignedWorker: name, department, no email
      expect(res.body.assignedWorker).toBeDefined();
      expect(res.body.assignedWorker.name).toBeDefined();
      expect(res.body.assignedWorker.department).toBe('Roads & Potholes');
      expect(res.body.assignedWorker.email).toBeUndefined();

      // Check statusHistory.changedBy: name, role, no email
      expect(Array.isArray(res.body.statusHistory)).toBe(true);
      expect(res.body.statusHistory.length).toBe(2);
      expect(res.body.statusHistory[1].changedBy.name).toBeDefined();
      expect(res.body.statusHistory[1].changedBy.role).toBe('dept_admin');
      expect(res.body.statusHistory[1].changedBy.email).toBeUndefined();
    });

    it('should return 404 for non-existent issue ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/issues/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/issue not found/i);
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/api/issues/not-a-valid-id');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid.*id/i);
    });
  });

  // ============================================================
  // PRIVACY CHECK (TASK 5: NO EMAIL IN PUBLIC GET /issues)
  // ============================================================
  describe('Privacy Check: GET /api/issues', () => {
    it('should contain no email field anywhere in the public issues response', async () => {
      const admin = await createUserWithRole('dept_admin', { email: 'priv_admin@example.com' });
      const worker = await createUserWithRole('worker', { email: 'priv_worker@example.com' });

      // Create issue and assign worker
      const issueRes = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Privacy Test Issue', description: 'Testing for no email leak', pincode: '560001' });

      await request(app)
        .patch(`/api/issues/${issueRes.body._id}/assign`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ workerId: worker.userId });

      const res = await request(app).get('/api/issues');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      // Verify no email key exists anywhere in the JSON response
      const rawJson = JSON.stringify(res.body);
      expect(rawJson.includes('"email"')).toBe(false);
    });
  });

  // ============================================================
  // PAGINATION, SEARCH & PRIORITY (TASK 4)
  // ============================================================
  describe('Pagination, Search & Priority: GET /api/issues', () => {
    beforeEach(async () => {
      // Seed distinct issues for testing pagination, search, priority
      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Broken Water Pipe', description: 'Leaking water near main market', pincode: '560001' });

      const admin = await createUserWithRole('dept_admin', { email: 'priority_admin@example.com' });
      const issue2 = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Dangerous Pothole on Highway', description: 'Huge crater on MG Road', pincode: '560002' });

      // Set priority on issue 2 to High
      await request(app)
        .put(`/api/issues/${issue2.body._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ priority: 'High' });

      await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Street Light Faulty', description: 'Flickering street light on 5th cross', pincode: '560001' });
    });

    it('should return plain array when neither page nor limit is passed (backward compatibility)', async () => {
      const res = await request(app).get('/api/issues');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.pagination).toBeUndefined();
    });

    it('should return paginated response when page or limit is passed', async () => {
      const res = await request(app).get('/api/issues?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should cap limit to 50 when higher limit is requested', async () => {
      const res = await request(app).get('/api/issues?limit=100');
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
    });

    it('should filter issues by case-insensitive search across title and description', async () => {
      const res = await request(app).get('/api/issues?search=highway');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toMatch(/highway/i);

      const resDesc = await request(app).get('/api/issues?search=crater');
      expect(resDesc.status).toBe(200);
      expect(resDesc.body.length).toBe(1);
    });

    it('should safely handle and escape regex special characters in search', async () => {
      const res = await request(app).get('/api/issues?search=MG+[Road]?*(test)');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Valid response without regex compilation crash
    });

    it('should filter issues by priority', async () => {
      const res = await request(app).get('/api/issues?priority=High');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].priority).toBe('High');
    });
  });
});

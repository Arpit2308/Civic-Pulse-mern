const path = require('path');
const fs = require('fs');
const { app, request, createAuthenticatedUser } = require('./helpers');

// Path to test uploads dir (same as app's upload dir)
const uploadsDir = path.join(__dirname, '..', 'uploads');

describe('Image Upload Endpoints', () => {
  let citizenToken;

  beforeEach(async () => {
    const citizen = await createAuthenticatedUser({
      email: 'uploaduser@example.com',
    });
    citizenToken = citizen.token;
  });

  // Clean up test files from uploads dir after each test
  afterEach(() => {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        // Only clean up files created during this test run (by filename pattern)
        if (file.startsWith('image-') || file.startsWith('proofImage-')) {
          try {
            fs.unlinkSync(path.join(uploadsDir, file));
          } catch (e) {
            // Ignore if already cleaned up
          }
        }
      }
    }
  });

  // ============================================================
  // VALID IMAGE UPLOAD
  // ============================================================
  describe('Valid Image Upload', () => {
    it('should accept a valid PNG image on POST /api/issues', async () => {
      // Minimal valid 1x1 PNG
      const validPng = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d040000000049454e44ae426082',
        'hex'
      );

      // Write to a temp file for supertest .attach()
      const tempFile = path.join(uploadsDir, 'test_valid.png');
      fs.writeFileSync(tempFile, validPng);

      try {
        const res = await request(app)
          .post('/api/issues')
          .set('Authorization', `Bearer ${citizenToken}`)
          .field('title', 'Issue with valid image')
          .field('description', 'This issue has a valid PNG')
          .field('pincode', '560001')
          .attach('image', tempFile);

        expect(res.status).toBe(201);
        expect(res.body.imageUrl).toBeDefined();
        expect(res.body.imageUrl).toMatch(/^\/uploads\//);

        // Verify the file was actually saved to disk
        const savedFilename = res.body.imageUrl.replace('/uploads/', '');
        const savedPath = path.join(uploadsDir, savedFilename);
        expect(fs.existsSync(savedPath)).toBe(true);
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });

    it('should accept a valid JPEG image on POST /api/complaints', async () => {
      // Minimal valid JPEG (JFIF header)
      const validJpeg = Buffer.from(
        'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc40000ffd9',
        'hex'
      );

      const tempFile = path.join(uploadsDir, 'test_valid.jpg');
      fs.writeFileSync(tempFile, validJpeg);

      try {
        const res = await request(app)
          .post('/api/complaints')
          .set('Authorization', `Bearer ${citizenToken}`)
          .field('brandName', 'TestBrand')
          .field('productName', 'TestProduct')
          .field('description', 'Complaint with JPEG proof')
          .field('category', 'Defective Product')
          .attach('proofImage', tempFile);

        expect(res.status).toBe(201);
        expect(res.body.proofImageUrl).toBeDefined();
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });
  });

  // ============================================================
  // OVERSIZED FILE
  // ============================================================
  describe('Oversized File Rejection', () => {
    it('should reject file > 5MB with 400', async () => {
      // Create a 6MB buffer with valid PNG header so it passes MIME check
      // but gets caught by size limit
      const pngHeader = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
        'hex'
      );
      const padding = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const oversized = Buffer.concat([pngHeader, padding]);

      const tempFile = path.join(uploadsDir, 'test_oversized.png');
      fs.writeFileSync(tempFile, oversized);

      try {
        const res = await request(app)
          .post('/api/issues')
          .set('Authorization', `Bearer ${citizenToken}`)
          .field('title', 'Oversized Image')
          .field('description', 'This file is too large')
          .field('pincode', '560001')
          .attach('image', tempFile);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/too large|5MB/i);
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });
  });

  // ============================================================
  // SPOOFED FILE TYPE (text content with .png extension and image/png Content-Type)
  // ============================================================
  describe('Spoofed File Type Rejection (Magic-Byte Validation)', () => {
    it('should reject a text file masquerading as PNG', async () => {
      // Plain text content, NOT valid PNG bytes
      const spoofedContent = Buffer.from(
        'This is a plain text file pretending to be a PNG image. Not valid image bytes at all.'
      );

      const tempFile = path.join(uploadsDir, 'test_spoofed.png');
      fs.writeFileSync(tempFile, spoofedContent);

      try {
        const res = await request(app)
          .post('/api/issues')
          .set('Authorization', `Bearer ${citizenToken}`)
          .field('title', 'Spoofed Image')
          .field('description', 'Text file with .png extension')
          .field('pincode', '560001')
          .attach('image', tempFile);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid file content/i);
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });

    it('should clean up rejected spoofed file from disk (no orphans)', async () => {
      const spoofedContent = Buffer.from('Fake image content for orphan test');
      const tempFile = path.join(uploadsDir, 'test_orphan.png');
      fs.writeFileSync(tempFile, spoofedContent);

      // Count files before upload attempt
      const filesBefore = fs.readdirSync(uploadsDir).filter(
        (f) => f.startsWith('image-') || f.startsWith('proofImage-')
      );

      try {
        await request(app)
          .post('/api/issues')
          .set('Authorization', `Bearer ${citizenToken}`)
          .field('title', 'Orphan Check')
          .field('description', 'Check no orphan file left')
          .field('pincode', '560001')
          .attach('image', tempFile);

        // Count files after — should be same (rejected file was cleaned up)
        const filesAfter = fs.readdirSync(uploadsDir).filter(
          (f) => f.startsWith('image-') || f.startsWith('proofImage-')
        );
        expect(filesAfter.length).toBe(filesBefore.length);
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });
  });

  // ============================================================
  // WRONG EXTENSION REJECTION
  // ============================================================
  describe('Wrong Extension/MIME Rejection', () => {
    it('should reject a .txt file even with valid extension mapping missing', async () => {
      const textContent = Buffer.from('Just a text file');
      const tempFile = path.join(uploadsDir, 'test_wrong.txt');
      fs.writeFileSync(tempFile, textContent);

      try {
        const res = await request(app)
          .post('/api/issues')
          .set('Authorization', `Bearer ${citizenToken}`)
          .field('title', 'Wrong Extension')
          .field('description', 'Text file with .txt extension')
          .field('pincode', '560001')
          .attach('image', tempFile);

        expect(res.status).toBe(400);
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });
  });

  // ============================================================
  // NO IMAGE (should still work — images are optional)
  // ============================================================
  describe('Request Without Image', () => {
    it('should create issue without an image', async () => {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'No Image Issue',
          description: 'This issue has no image attached',
          pincode: '560001',
        });

      expect(res.status).toBe(201);
      expect(res.body.imageUrl).toBe('');
    });
  });
});

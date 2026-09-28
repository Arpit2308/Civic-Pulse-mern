const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Dynamic loader for ESM file-type package
let fileTypeModule;
const getFileType = async () => {
  if (!fileTypeModule) {
    fileTypeModule = await import('file-type');
  }
  return fileTypeModule;
};

// Local storage directory
const uploadDir = path.join(__dirname, '..', 'uploads');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Storage Configuration
// Isolated so swapping to Cloudinary or AWS S3 is a simple local modification in this file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// 2. Client-provided Header Filter (preliminary gate)
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isExtAllowed = allowedExtensions.includes(ext);
  const isMimeAllowed = allowedMimeTypes.includes(file.mimetype);

  if (isExtAllowed && isMimeAllowed) {
    return cb(null, true);
  }

  const error = new Error(
    `Invalid file type (${file.mimetype}). Only JPG, JPEG, PNG, and WEBP image files are allowed.`
  );
  error.status = 400;
  error.statusCode = 400;
  return cb(error, false);
};

// 3. Multer Instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// 4. URL Resolver (can be swapped for S3/Cloudinary URLs)
const getFileUrl = (file) => {
  if (!file) return '';
  return `/uploads/${file.filename}`;
};

// 5. Middleware accepting single image upload with real magic-bytes inspection
const uploadSingleImage = (req, res, next) => {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'proofImage', maxCount: 1 },
    { name: 'imageUrl', maxCount: 1 },
    { name: 'proofImageUrl', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const sizeErr = new Error('File too large. Maximum allowed size is 5MB.');
        sizeErr.status = 400;
        sizeErr.statusCode = 400;
        return next(sizeErr);
      }
      err.status = 400;
      err.statusCode = 400;
      return next(err);
    }

    if (req.files) {
      req.file =
        req.files['image']?.[0] ||
        req.files['proofImage']?.[0] ||
        req.files['imageUrl']?.[0] ||
        req.files['proofImageUrl']?.[0];
    }

    // 6. Deep Content Validation via Magic Bytes (file-type)
    // Prevents MIME-spoofing where a text, HTML, or executable file claims Content-Type: image/png
    if (req.file && req.file.path) {
      try {
        const { fileTypeFromFile } = await getFileType();
        const detected = await fileTypeFromFile(req.file.path);

        const genuineImageMimes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!detected || !genuineImageMimes.includes(detected.mime)) {
          // Immediately purge spoofed/invalid file from disk to avoid orphans
          if (fs.existsSync(req.file.path)) {
            await fs.promises.unlink(req.file.path);
          }
          req.file = undefined;

          const detectedType = detected ? detected.mime : 'unrecognized / text';
          const spoofError = new Error(
            `Invalid file content: detected actual type is '${detectedType}'. Only genuine JPEG, PNG, and WEBP image files are allowed.`
          );
          spoofError.status = 400;
          spoofError.statusCode = 400;
          return next(spoofError);
        }
      } catch (valErr) {
        // If file reading or inspection encounters an error, ensure file is cleaned up
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        req.file = undefined;
        valErr.status = 400;
        valErr.statusCode = 400;
        return next(valErr);
      }
    }

    next();
  });
};

module.exports = {
  upload,
  uploadSingleImage,
  getFileUrl,
  uploadDir,
};

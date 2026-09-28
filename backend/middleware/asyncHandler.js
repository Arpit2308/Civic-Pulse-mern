// Wraps async controller functions to ensure any unhandled rejections/exceptions
// are forwarded directly to Express next(error) and caught by the global error handler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

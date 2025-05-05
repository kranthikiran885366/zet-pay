// backend/middleware/asyncHandler.js

/**
 * Wraps an asynchronous route handler function to catch errors and pass them to the next error-handling middleware.
 * @param {Function} fn The asynchronous route handler function.
 * @returns {Function} A new function that handles async errors.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

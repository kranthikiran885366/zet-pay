// backend/middleware/errorMiddleware.js
const { FirebaseError } = require('firebase-admin'); // Import FirebaseError for specific handling

function errorMiddleware(err, req, res, next) {
  // Log the full error stack in development or staging for debugging
  if (process.env.NODE_ENV !== 'production') {
      console.error('Unhandled Error:', err.stack || err);
  } else {
      // In production, log less detail to console but maybe more to logging service
      console.error(`Error: ${err.message}, Status: ${err.statusCode || 500}, Path: ${req.originalUrl}`);
  }

  // Determine status code
  let statusCode = res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500); // Use res.statusCode if already set
  let message = err.message || 'Internal Server Error';

  // --- Customize error responses based on error type ---

  // Validation Errors (e.g., from express-validator if used)
  if (err.name === 'ValidationError' || (Array.isArray(err.errors) && err.errors.length > 0)) {
    statusCode = 400;
    message = 'Validation Failed';
    // Optionally include specific validation errors
    // errors: err.errors.map(e => e.msg)
  }

  // Firebase Admin SDK Errors
  if (err instanceof FirebaseError) {
      message = `Firebase Error: ${err.code || err.message}`;
      // Determine appropriate status code based on Firebase error code
      if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
          statusCode = 401; // Unauthorized
          message = "Authentication failed. Please log in again." // User-friendly message
      } else if (err.code === 'permission-denied') {
           statusCode = 403; // Forbidden
           message = "Permission denied."
      } else if (err.code === 'not-found') {
          statusCode = 404; // Not Found
      }
      // Add more Firebase error codes as needed
  }

  // Handle generic errors that might have a status set but no specific message
   if (statusCode === 400 && message === 'Bad Request') {
       message = err.message || 'Invalid request data provided.';
   }
   if (statusCode === 401 && message === 'Unauthorized') {
        message = err.message || 'Authentication required.';
   }
    if (statusCode === 404 && message === 'Not Found') {
        message = err.message || `Resource not found at ${req.originalUrl}`;
    }


  // Ensure status code is a valid HTTP status
   if (statusCode < 100 || statusCode >= 600) {
      console.warn(`Invalid status code detected: ${statusCode}. Resetting to 500.`);
      statusCode = 500;
   }

  // Send JSON error response
  res.status(statusCode).json({
    // Use a consistent error shape
    status: 'error',
    statusCode,
    message,
    // Optionally include stack trace ONLY in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    // Optionally add error code if available
    // code: err.code || undefined
  });
}

module.exports = errorMiddleware;

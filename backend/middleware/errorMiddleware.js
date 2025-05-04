
function errorMiddleware(err, req, res, next) {
  console.error('Unhandled Error:', err.stack || err);

  // Determine status code
  let statusCode = err.statusCode || 500; // Use custom status code if provided, else 500
  let message = err.message || 'Internal Server Error';

  // Customize error messages based on error type (optional)
  if (err.name === 'ValidationError') { // Example for validation errors
    statusCode = 400;
    message = 'Validation Failed';
    // You might want to include validation details: details: err.errors
  }

  // Send JSON error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Optionally include stack trace in development mode
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = errorMiddleware;

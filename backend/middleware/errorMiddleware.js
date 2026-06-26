export function errorHandler(err, req, res, next) {
  console.error('[Error Middleware]:', err.stack || err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An unexpected server error occurred.',
    status
  });
}

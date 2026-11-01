module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  let status = error.status || 500;
  let message = error.message || 'Internal server error.';

  if (error.code === '23505') {
    status = 409;
    message = 'A record with that unique value already exists.';
  } else if (error.code === '23503') {
    status = 400;
    message = 'A referenced record does not exist.';
  } else if (error.code === '23514') {
    status = 400;
    message = 'A value violates a database constraint.';
  }

  if (status >= 500) {
    console.error(error);
    message = 'Internal server error.';
  }

  const body = { error: { message } };
  if (error.details !== undefined) body.error.details = error.details;
  res.status(status).json(body);
};

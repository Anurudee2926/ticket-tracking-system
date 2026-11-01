const HttpError = require('../utils/httpError');

module.exports = (req, res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

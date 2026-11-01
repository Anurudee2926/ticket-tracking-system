const HttpError = require('../utils/httpError');

function validateBody(allowedFields, requiredFields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next(new HttpError(400, 'Request body must be a JSON object.'));
    }
    const unknown = Object.keys(req.body).filter((key) => !allowedFields.includes(key));
    if (unknown.length) {
      return next(new HttpError(400, `Unknown field(s): ${unknown.join(', ')}.`));
    }
    const missing = requiredFields.filter((key) => req.body[key] === undefined);
    if (missing.length) {
      return next(new HttpError(400, `Missing required field(s): ${missing.join(', ')}.`));
    }
    next();
  };
}

module.exports = { validateBody };

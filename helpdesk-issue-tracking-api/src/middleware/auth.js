const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../db/pool');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Provide a valid Bearer token.');
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new HttpError(401, 'Token is invalid or expired.');
  }

  const result = await db.query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [payload.sub]
  );
  if (result.rowCount === 0) {
    throw new HttpError(401, 'User account no longer exists.');
  }

  req.user = result.rows[0];
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };

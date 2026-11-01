const HttpError = require('./httpError');

function requireString(value, field, { min = 1, max = 1000 } = {}) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max} characters.`);
  }
  return trimmed;
}

function requireId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, `${field} must be a positive integer.`);
  }
  return id;
}

function enumValue(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value;
}

module.exports = { requireString, requireId, enumValue };

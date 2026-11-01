const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const { jwtSecret, jwtExpiresIn, bcryptRounds } = require('../config/env');
const HttpError = require('../utils/httpError');
const { requireString } = require('../utils/validators');

async function register({ name, email, password }) {
  name = requireString(name, 'name', { min: 2, max: 100 });
  email = requireString(email, 'email', { min: 5, max: 254 }).toLowerCase();
  password = requireString(password, 'password', { min: 10, max: 128 });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Provide a valid email address.');
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function login({ email, password }) {
  email = requireString(email, 'email', { min: 5, max: 254 }).toLowerCase();
  password = requireString(password, 'password', { min: 1, max: 128 });

  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const token = jwt.sign(
    { sub: String(user.id), role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
  return {
    token,
    tokenType: 'Bearer',
    expiresIn: jwtExpiresIn,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  };
}

module.exports = { register, login };

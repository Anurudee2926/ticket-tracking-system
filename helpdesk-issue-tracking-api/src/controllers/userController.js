const asyncHandler = require('../utils/asyncHandler');
const db = require('../db/pool');

exports.me = (req, res) => res.json({ data: req.user });

exports.list = asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ data: result.rows });
});

const { Pool } = require('pg');
const { databaseUrl } = require('../config/env');

const pool = new Pool({
  connectionString: databaseUrl,
  // For hosted PostgreSQL, configure SSL according to your provider.
  // Do not blindly disable certificate verification in production.
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  close: () => pool.end()
};

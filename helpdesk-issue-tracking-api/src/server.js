const app = require('./app');
const { port } = require('./config/env');
const initializeDatabase = require('./db/init');
const db = require('./db/pool');

async function start() {
  try {
    await initializeDatabase();
    const server = app.listen(port, () => {
      console.log(`Helpdesk API listening at http://localhost:${port}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received; shutting down...`);
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start API:', error);
    await db.close().catch(() => {});
    process.exit(1);
  }
}

start();

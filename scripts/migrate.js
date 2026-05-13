const fs = require('fs');
const path = require('path');
const { getClient } = require('../src/db');

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    await ensureSchemaMigrationsTable(client);

    const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
        [filename]
      );

      if (alreadyApplied.rowCount > 0) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      console.log(`Applied migration: ${filename}`);
    }

    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

run();

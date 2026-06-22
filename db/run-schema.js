import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const {Client} = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, '../.env')});

function assertSafeDatabaseName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Unsafe PostgreSQL database name "${name}". Use letters, numbers, and underscores only.`,
    );
  }
}

async function ensureDatabaseExists() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const database = process.env.DB_NAME || 'ustaadpro_db';
  assertSafeDatabaseName(database);

  const adminClient = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_ADMIN_DATABASE || 'postgres',
  });

  try {
    await adminClient.connect();
    const result = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );

    if (!result.rowCount) {
      await adminClient.query(`CREATE DATABASE "${database}"`);
      console.log(`Created PostgreSQL database "${database}".`);
    }
  } finally {
    await adminClient.end();
  }
}

async function runSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  await ensureDatabaseExists();

  const client = new Client(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl:
            process.env.DB_SSL === 'true'
              ? {rejectUnauthorized: false}
              : undefined,
        }
      : {
          host: process.env.DB_HOST || '127.0.0.1',
          port: Number(process.env.DB_PORT || 5432),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'ustaadpro_db',
        },
  );

  try {
    await client.connect();
    await client.query(sql);
    console.log('PostgreSQL schema.sql executed successfully.');
  } finally {
    await client.end();
  }
}

runSchema().catch(error => {
  console.error('Failed to execute PostgreSQL schema.sql:', error.message);
  process.exit(1);
});

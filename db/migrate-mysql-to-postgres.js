import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import pg from 'pg';

const {Client: PgClient} = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, '../.env')});

const tables = [
  'users',
  'categories',
  'subcategories',
  'services',
  'user_addresses',
  'auth_otps',
  'home_slides',
  'app_settings',
  'subscriptions',
  'orders',
  'order_items',
  'service_reviews',
  'shop_products',
  'shop_orders',
  'shop_order_items',
];

const jsonColumns = new Set([
  'payload',
  'details',
  'includes',
  'excludes',
  'perks',
]);

const serialTables = [
  ['users', 'id'],
  ['user_addresses', 'id'],
  ['auth_otps', 'id'],
  ['order_items', 'id'],
  ['service_reviews', 'id'],
  ['shop_order_items', 'id'],
];

function mysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'ustaadpro_db',
  };
}

function postgresConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : undefined,
    };
  }

  return {
    host:
      process.env.PG_HOST ||
      process.env.POSTGRES_HOST ||
      process.env.DB_HOST ||
      '127.0.0.1',
    port: Number(
      process.env.PG_PORT ||
        process.env.POSTGRES_PORT ||
        process.env.DB_PORT ||
        5432,
    ),
    user:
      process.env.PG_USER ||
      process.env.POSTGRES_USER ||
      process.env.DB_USER ||
      'postgres',
    password:
      process.env.PG_PASSWORD ||
      process.env.POSTGRES_PASSWORD ||
      process.env.DB_PASSWORD ||
      'postgres',
    database:
      process.env.PG_DATABASE ||
      process.env.POSTGRES_DATABASE ||
      process.env.DB_NAME ||
      'ustaadpro_db',
  };
}

function assertSafeDatabaseName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Unsafe PostgreSQL database name "${name}". Use letters, numbers, and underscores only.`,
    );
  }
}

function postgresDatabaseName() {
  return (
    process.env.PG_DATABASE ||
    process.env.POSTGRES_DATABASE ||
    process.env.DB_NAME ||
    'ustaadpro_db'
  );
}

async function ensurePostgresDatabaseExists() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const database = postgresDatabaseName();
  assertSafeDatabaseName(database);

  const adminClient = new PgClient({
    host: process.env.PG_HOST || process.env.POSTGRES_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(
      process.env.PG_PORT ||
        process.env.POSTGRES_PORT ||
        process.env.DB_PORT ||
        5432,
    ),
    user: process.env.PG_USER || process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
    password:
      process.env.PG_PASSWORD ||
      process.env.POSTGRES_PASSWORD ||
      process.env.DB_PASSWORD ||
      'postgres',
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

function normalizeValue(column, value) {
  if (value === undefined) return null;
  if (!jsonColumns.has(column)) return value;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

async function runSchema(pgClient) {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pgClient.query(schema);
}

async function copyTable(mysqlConnection, pgClient, table) {
  let rows;
  try {
    [rows] = await mysqlConnection.query(`SELECT * FROM \`${table}\``);
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.log(`Skipping ${table}: table does not exist in MySQL.`);
      return;
    }
    throw error;
  }

  if (!rows.length) {
    console.log(`Copied ${table}: 0 rows.`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map(column => `"${column}"`).join(', ');
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const sql = `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = columns.map(column => normalizeValue(column, row[column]));
    await pgClient.query(sql, values);
  }

  console.log(`Copied ${table}: ${rows.length} row(s).`);
}

async function resetSequences(pgClient) {
  for (const [table, column] of serialTables) {
    await pgClient.query(
      `SELECT setval(
        pg_get_serial_sequence($1, $2),
        COALESCE((SELECT MAX("${column}") FROM "${table}"), 1),
        (SELECT COUNT(*) FROM "${table}") > 0
      )`,
      [table, column],
    );
  }
}

async function migrate() {
  const mysqlConnection = await mysql.createConnection(mysqlConfig());
  await ensurePostgresDatabaseExists();
  const pgClient = new PgClient(postgresConfig());

  try {
    await pgClient.connect();
    await runSchema(pgClient);

    for (const table of tables) {
      await copyTable(mysqlConnection, pgClient, table);
    }

    await resetSequences(pgClient);
    console.log('MySQL to PostgreSQL data migration completed successfully.');
  } finally {
    await mysqlConnection.end();
    await pgClient.end();
  }
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import db from '../config/db.js';

dotenv.config();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'superadmin@ustaadpro.pk';
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD || 'SUPERadmin@1123';

async function ensureAdminCredentialsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'superadmin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedPassword() {
  try {
    await ensureAdminCredentialsTable();

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await db.query(
      `INSERT INTO admin_credentials (email, password_hash, role, updated_at)
       VALUES (?, ?, 'superadmin', CURRENT_TIMESTAMP)
       ON CONFLICT (email)
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         updated_at = CURRENT_TIMESTAMP`,
      [ADMIN_EMAIL.toLowerCase(), passwordHash],
    );

    console.log(`Admin login seeded for ${ADMIN_EMAIL.toLowerCase()}`);
  } catch (error) {
    console.error('Failed to seed admin login:', error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

seedPassword();


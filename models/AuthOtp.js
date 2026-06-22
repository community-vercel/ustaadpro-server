import pool from '../config/db.js';

class AuthOtp {
  static async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        payload JSONB NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP NULL,
        attempts INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_auth_otps_email_purpose ON auth_otps (email, purpose)',
    );
  }

  static async create({ email, purpose, codeHash, payload, expiresAt }) {
    await this.ensureTable();
    await pool.query(
      'UPDATE auth_otps SET consumed_at = NOW() WHERE email = ? AND purpose = ? AND consumed_at IS NULL',
      [email, purpose]
    );
    const [rows] = await pool.query(
      'INSERT INTO auth_otps (email, purpose, code_hash, payload, expires_at) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [email, purpose, codeHash, JSON.stringify(payload || null), expiresAt]
    );
    return rows[0].id;
  }

  static async findLatestActive(email, purpose) {
    await this.ensureTable();
    const [rows] = await pool.query(
      `SELECT * FROM auth_otps
       WHERE email = ? AND purpose = ? AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, purpose]
    );
    return rows[0] || null;
  }

  static async incrementAttempts(id) {
    await pool.query('UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?', [id]);
  }

  static async consume(id) {
    await pool.query('UPDATE auth_otps SET consumed_at = NOW() WHERE id = ?', [id]);
  }
}

export default AuthOtp;

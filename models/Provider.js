import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

class Provider {
  static async ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(160) NOT NULL UNIQUE,
        phone VARCHAR(30) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        trade VARCHAR(120) NOT NULL,
        commission_percent NUMERIC(5,2) NOT NULL DEFAULT 80,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        rating NUMERIC(3,2) NOT NULL DEFAULT 0,
        completed_jobs INT NOT NULL DEFAULT 0,
        latitude NUMERIC(10,7),
        longitude NUMERIC(10,7),
        location_recorded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_id INT REFERENCES providers(id) ON DELETE SET NULL');
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_job_status VARCHAR(30) DEFAULT 'assigned'");
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP');
  }

  static format(row) {
    if (!row) return null;
    return {
      id: String(row.id), name: row.name, email: row.email, phone: row.phone,
      trade: row.trade, commissionPercent: Number(row.commissionPercent ?? row.commission_percent ?? 80),
      isAvailable: Boolean(row.isAvailable ?? row.is_available),
      isActive: Boolean(row.isActive ?? row.is_active), rating: Number(row.rating || 0),
      completedJobs: Number(row.completedJobs ?? row.completed_jobs ?? 0),
      acceptanceRate: 100, onTimeRate: 100,
      verificationStatus: 'verified',
      createdAt: row.createdAt ?? row.created_at,
    };
  }

  static async list() {
    await this.ensureSchema();
    const [rows] = await pool.query('SELECT * FROM providers ORDER BY created_at DESC');
    return rows.map(this.format);
  }

  static async create(input) {
    await this.ensureSchema();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const [rows] = await pool.query(
      `INSERT INTO providers (name, email, phone, password_hash, trade, commission_percent, is_available, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [input.name, input.email, input.phone, passwordHash, input.trade,
       input.commissionPercent ?? 80, input.isAvailable !== false, input.isActive !== false],
    );
    return this.format(rows[0]);
  }

  static async update(id, input) {
    await this.ensureSchema();
    const values = [input.name, input.email, input.phone, input.trade,
      input.commissionPercent ?? 80, input.isAvailable !== false, input.isActive !== false, id];
    const passwordSql = input.password ? ', password_hash = ?' : '';
    if (input.password) values.splice(values.length - 1, 0, await bcrypt.hash(input.password, 12));
    const [rows] = await pool.query(
      `UPDATE providers SET name=?, email=?, phone=?, trade=?, commission_percent=?, is_available=?, is_active=?${passwordSql}, updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING *`,
      values,
    );
    return this.format(rows[0]);
  }

  static async findForLogin(identifier) {
    await this.ensureSchema();
    const [rows] = await pool.query(
      'SELECT * FROM providers WHERE (LOWER(email)=LOWER(?) OR phone=?) AND is_active=TRUE LIMIT 1',
      [identifier, identifier],
    );
    return rows[0] || null;
  }
}

export default Provider;

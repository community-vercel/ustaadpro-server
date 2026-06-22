import pool from '../config/db.js';

async function ensureUserAddressTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      label VARCHAR(80) NOT NULL,
      detail VARCHAR(255) NOT NULL,
      is_default SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

class UserAddress {
  static async findByUserId(userId) {
    await ensureUserAddressTable();
    const [rows] = await pool.query(
      'SELECT id, label, detail, is_default as isDefault, created_at as createdAt FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId],
    );
    return rows;
  }

  static async create({userId, label, detail, isDefault = false}) {
    await ensureUserAddressTable();

    if (isDefault) {
      await pool.query(
        'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
        [userId],
      );
    }

    const [rows] = await pool.query(
      'INSERT INTO user_addresses (user_id, label, detail, is_default) VALUES (?, ?, ?, ?) RETURNING id',
      [userId, label, detail, isDefault ? 1 : 0],
    );

    return rows[0].id;
  }

  static async update({id, userId, label, detail, isDefault = false}) {
    await ensureUserAddressTable();

    if (isDefault) {
      await pool.query(
        'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
        [userId],
      );
    }

    const [result] = await pool.query(
      `UPDATE user_addresses
       SET label = ?, detail = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [label, detail, isDefault ? 1 : 0, id, userId],
    );

    return result.affectedRows > 0;
  }
}

export default UserAddress;

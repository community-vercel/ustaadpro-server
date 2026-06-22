import pool from '../config/db.js';

class Subscription {
  static async getAll() {
    const query = 'SELECT * FROM subscriptions ORDER BY price ASC';
    const [rows] = await pool.query(query);
    return rows.map(row => ({
      ...row,
      originalPrice: row.original_price,
      perks: typeof row.perks === 'string' ? JSON.parse(row.perks || '[]') : row.perks || [],
    }));
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM subscriptions WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      ...row,
      originalPrice: row.original_price,
      perks: typeof row.perks === 'string' ? JSON.parse(row.perks || '[]') : row.perks || [],
    };
  }

  static async create(payload) {
    const id =
      payload.id ||
      payload.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    await pool.query(
      `INSERT INTO subscriptions (id, title, duration, price, original_price, perks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.title,
        payload.duration || '1 month',
        Number(payload.price || 0),
        Number(payload.originalPrice || payload.original_price || payload.price || 0),
        JSON.stringify(payload.perks || []),
      ]
    );

    return id;
  }

  static async update(id, payload) {
    await pool.query(
      `UPDATE subscriptions
       SET title = ?, duration = ?, price = ?, original_price = ?, perks = ?
       WHERE id = ?`,
      [
        payload.title,
        payload.duration || '1 month',
        Number(payload.price || 0),
        Number(payload.originalPrice || payload.original_price || payload.price || 0),
        JSON.stringify(payload.perks || []),
        id,
      ]
    );
  }

  static async delete(id) {
    await pool.query('DELETE FROM subscriptions WHERE id = ?', [id]);
  }
}

export default Subscription;

import pool from '../config/db.js';

class User {
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, phone, email, wallet_balance as walletBalance, coins, created_at as createdAt FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByPhone(phone) {
    const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async create({ name, phone, email, password, walletBalance = 5200.00, coins = 1280 }) {
    const [rows] = await pool.query(
      'INSERT INTO users (name, phone, email, password, wallet_balance, coins) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [name, phone, email, password, walletBalance, coins]
    );
    return rows[0].id;
  }

  static async updateWallet(id, balance, coins) {
    await pool.query(
      'UPDATE users SET wallet_balance = ?, coins = ? WHERE id = ?',
      [balance, coins, id]
    );
  }

  static async updateFcmToken(id, token) {
    await pool.query('UPDATE users SET fcm_token = ? WHERE id = ?', [token, id]);
  }

  static async updatePassword(id, password) {
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [password, id]);
  }

  static async getFcmToken(id) {
    const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [id]);
    return rows[0]?.fcm_token;
  }
}

export default User;

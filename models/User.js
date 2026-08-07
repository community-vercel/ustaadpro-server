import pool from '../config/db.js';

class User {
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, phone, email, wallet_balance as walletBalance, coins, reward_points as rewardPoints, created_at as createdAt FROM users WHERE id = ?',
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

  static async create({ name, phone, email, password, walletBalance = 0, coins = 1280 }) {
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

  static async consumeWallet(id, maximumAmount) {
    const amount = Math.max(0, Number(maximumAmount || 0));
    if (!amount) {
      console.info('[Wallet] Skipped deduction for user ' + id + ': requested amount is zero.');
      return 0;
    }
    console.info('[Wallet] Deduction requested for user ' + id + '; maximum Rs ' + amount + '.');
    const [rows] = await pool.query(
      `WITH current_balance AS (
         SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE
       )
       UPDATE users u
       SET wallet_balance = u.wallet_balance - LEAST(u.wallet_balance, ?)
       FROM current_balance current
       WHERE u.id = ?
       RETURNING LEAST(current.wallet_balance, ?) AS wallet_used`,
      [id, amount, id, amount],
    );
    const walletUsed = Number(rows[0]?.walletUsed || rows[0]?.wallet_used || 0);
    console.info('[Wallet] Deducted Rs ' + walletUsed + ' for user ' + id + '.');
    return walletUsed;
  }

  static async creditWallet(id, amount) {
    const creditAmount = Math.max(0, Number(amount || 0));
    await pool.query(
      'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?',
      [creditAmount, id],
    );
    console.info('[Wallet] Restored Rs ' + creditAmount + ' to user ' + id + '.');
  }
  static async addRewardPoints(id, points) {
    await pool.query(
      'UPDATE users SET reward_points = GREATEST(0, COALESCE(reward_points, 0) + ?) WHERE id = ?',
      [Number(points || 0), id],
    );
  }

  static async redeemRewardPoints(id, points) {
    const [result] = await pool.query(
      'UPDATE users SET reward_points = reward_points - ? WHERE id = ? AND reward_points >= ?',
      [Number(points || 0), id, Number(points || 0)],
    );

    return Number(result.affectedRows || result.rowCount || 0) > 0;
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

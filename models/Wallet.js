import pool from '../config/db.js';

export const WITHDRAWAL_METHODS = ['easypaisa', 'jazzcash', 'bank'];
export const MIN_WITHDRAWAL_AMOUNT = 100;

function normalizeWithdrawal(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.userId ?? row.user_id),
    amount: Number(row.amount),
    method: row.method,
    accountNumber: row.accountNumber ?? row.account_number,
    accountName: row.accountName ?? row.account_name ?? null,
    bankName: row.bankName ?? row.bank_name ?? null,
    status: row.status || 'pending',
    adminNote: row.adminNote ?? row.admin_note ?? null,
    processedAt: row.processedAt ?? row.processed_at ?? null,
    createdAt: row.createdAt ?? row.created_at,
    userName: row.userName ?? row.user_name ?? undefined,
    userPhone: row.userPhone ?? row.user_phone ?? undefined,
    userEmail: row.userEmail ?? row.user_email ?? undefined,
  };
}

class Wallet {
  static async ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(20) NOT NULL,
        account_number VARCHAR(60) NOT NULL,
        account_name VARCHAR(120) NULL,
        bank_name VARCHAR(120) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        admin_note TEXT NULL,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT wallet_withdrawal_status CHECK (status IN ('pending', 'approved', 'rejected')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user ON wallet_withdrawals (user_id, created_at DESC)',
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON wallet_withdrawals (status, created_at DESC)',
    );
  }

  static validateRequest({ amount, method, accountNumber, accountName, bankName }) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      const error = new Error('Enter a valid withdrawal amount.');
      error.statusCode = 400;
      throw error;
    }
    if (value < MIN_WITHDRAWAL_AMOUNT) {
      const error = new Error(`Minimum withdrawal amount is Rs ${MIN_WITHDRAWAL_AMOUNT}.`);
      error.statusCode = 400;
      throw error;
    }
    const normalizedMethod = String(method || '').trim().toLowerCase();
    if (!WITHDRAWAL_METHODS.includes(normalizedMethod)) {
      const error = new Error('Select a valid withdrawal method (Easypaisa, JazzCash or Bank).');
      error.statusCode = 400;
      throw error;
    }
    const account = String(accountNumber || '').trim();
    if (!account) {
      const error = new Error(
        normalizedMethod === 'bank'
          ? 'Bank account number is required.'
          : 'Account number is required.',
      );
      error.statusCode = 400;
      throw error;
    }
    const input = {
      amount: Math.round(value * 100) / 100,
      method: normalizedMethod,
      accountNumber: account,
      accountName: String(accountName || '').trim() || null,
      bankName: String(bankName || '').trim() || null,
    };
    if (normalizedMethod === 'bank' && !input.bankName) {
      const error = new Error('Bank name is required for bank transfers.');
      error.statusCode = 400;
      throw error;
    }
    return input;
  }

  static async requestWithdrawal(userId, input) {
    await this.ensureSchema();
    const data = this.validateRequest(input);

    // Atomically deduct the amount from the user's wallet only if the balance covers it.
    // The money stays "held" with the withdrawal request until the admin decides.
    const [deductResult] = await pool.query(
      'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ? AND COALESCE(wallet_balance, 0) >= ?',
      [data.amount, userId, data.amount],
    );
    if (!Number(deductResult?.affectedRows ?? deductResult?.rowCount ?? 0)) {
      const error = new Error('Insufficient wallet balance for this withdrawal.');
      error.statusCode = 400;
      throw error;
    }

    try {
      const [rows] = await pool.query(
        `INSERT INTO wallet_withdrawals
         (user_id, amount, method, account_number, account_name, bank_name, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING *`,
        [userId, data.amount, data.method, data.accountNumber, data.accountName, data.bankName],
      );
      return normalizeWithdrawal(rows[0]);
    } catch (error) {
      // Roll back the deduction if the record could not be created.
      await pool.query(
        'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?',
        [data.amount, userId],
      );
      throw error;
    }
  }

  static async getWithdrawalsForUser(userId) {
    await this.ensureSchema();
    const [rows] = await pool.query(
      `SELECT * FROM wallet_withdrawals WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(normalizeWithdrawal);
  }

  static async getBalance(userId) {
    const [rows] = await pool.query(
      'SELECT COALESCE(wallet_balance, 0) AS balance FROM users WHERE id = ?',
      [userId],
    );
    return Number(rows[0]?.balance ?? rows[0]?.BALANCE ?? 0);
  }

  static async listForAdmin({ status, limit = 50, offset = 0 } = {}) {
    await this.ensureSchema();
    const params = [];
    let where = '';
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where = 'WHERE w.status = ?';
      params.push(status);
    }
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const offsetNum = Math.max(0, Number(offset) || 0);

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM wallet_withdrawals w ${where}`,
      params,
    );
    const [rows] = await pool.query(
      `SELECT w.*, u.name AS user_name, u.phone AS user_phone, u.email AS user_email
       FROM wallet_withdrawals w
       JOIN users u ON u.id = w.user_id
       ${where}
       ORDER BY CASE w.status WHEN 'pending' THEN 0 ELSE 1 END, w.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params,
    );
    const total = Number(countRow?.total ?? countRow?.COUNT ?? 0);
    return {
      withdrawals: rows.map(normalizeWithdrawal),
      total,
      hasMore: offsetNum + rows.length < total,
    };
  }

  static async updateStatus(id, status, adminNote = null) {
    await this.ensureSchema();
    if (!['approved', 'rejected'].includes(status)) {
      const error = new Error('Status must be approved or rejected.');
      error.statusCode = 400;
      throw error;
    }

    const [rows] = await pool.query('SELECT * FROM wallet_withdrawals WHERE id = ? LIMIT 1', [id]);
    const withdrawal = normalizeWithdrawal(rows[0]);
    if (!withdrawal) {
      const error = new Error('Withdrawal request not found.');
      error.statusCode = 404;
      throw error;
    }
    if (withdrawal.status !== 'pending') {
      const error = new Error(`This request was already ${withdrawal.status}.`);
      error.statusCode = 409;
      throw error;
    }

    await pool.query(
      'UPDATE wallet_withdrawals SET status = ?, admin_note = ?, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, adminNote || null, id],
    );

    if (status === 'rejected') {
      // Return the held amount to the user's wallet.
      await pool.query(
        'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?',
        [withdrawal.amount, withdrawal.userId],
      );
    }

    return normalizeWithdrawal({ ...withdrawal, status, adminNote: adminNote || null });
  }

  static async adminSummary() {
    await this.ensureSchema();
    const [[row]] = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) AS approved_amount
      FROM wallet_withdrawals
    `);
    return {
      pendingCount: Number(row?.pendingCount ?? row?.pending_count ?? 0),
      pendingAmount: Number(row?.pendingAmount ?? row?.pending_amount ?? 0),
      approvedAmount: Number(row?.approvedAmount ?? row?.approved_amount ?? 0),
    };
  }
}

export default Wallet;

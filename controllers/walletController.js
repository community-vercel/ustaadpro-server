import Wallet from '../models/Wallet.js';
import pool from '../config/db.js';

export const getWalletOverview = async (req, res) => {
  try {
    const [balance, withdrawals] = await Promise.all([
      Wallet.getBalance(req.user.id),
      Wallet.getWithdrawalsForUser(req.user.id),
    ]);
    res.json({
      walletBalance: balance,
      minWithdrawalAmount: Wallet.MIN_WITHDRAWAL_AMOUNT,
      withdrawalMethods: Wallet.WITHDRAWAL_METHODS,
      withdrawals,
    });
  } catch (error) {
    console.error('Wallet overview error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const requestWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Wallet.requestWithdrawal(req.user.id, req.body || {});
    const balance = await Wallet.getBalance(req.user.id);
    res.status(201).json({
      message: 'Withdrawal request submitted. You will be notified once it is processed.',
      withdrawal,
      walletBalance: balance,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({message: error.message});
    }
    console.error('Withdrawal request error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

// ── Admin endpoints ──
export const getAdminWithdrawals = async (req, res) => {
  try {
    const status = String(req.query.status || '').trim().toLowerCase();
    const [page, summary] = await Promise.all([
      Wallet.listForAdmin({
        status: status || undefined,
        limit: req.query.limit,
        offset: req.query.offset,
      }),
      Wallet.adminSummary(),
    ]);
    res.json({...page, summary});
  } catch (error) {
    console.error('Admin withdrawals error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateAdminWithdrawalStatus = async (req, res) => {
  try {
    const status = String(req.body?.status || '').trim().toLowerCase();
    const withdrawal = await Wallet.updateStatus(req.params.id, status, req.body?.adminNote);
    const [userRows] = await pool.query(
      'SELECT wallet_balance AS walletBalance FROM users WHERE id = ? LIMIT 1',
      [withdrawal.userId],
    );
    res.json({message: `Withdrawal ${status}.`, withdrawal, walletBalance: Number(userRows[0]?.walletBalance || 0)});
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({message: error.message});
    }
    console.error('Admin withdrawal update error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

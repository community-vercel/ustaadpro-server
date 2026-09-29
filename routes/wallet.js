import express from 'express';
import {getWalletOverview, requestWithdrawal} from '../controllers/walletController.js';
import {verifyToken} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getWalletOverview);
router.post('/withdrawals', verifyToken, requestWithdrawal);

export default router;

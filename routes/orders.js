import express from 'express';
import {
  cancelOrder,
  checkout,
  getOrders,
  getOrderStatuses,
  getPaymentReceiptImage,
  getLoyaltyStatus,
  updateOrder,
  uploadPaymentReceipt,
} from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/checkout', verifyToken, checkout);
router.get('/loyalty-status', verifyToken, getLoyaltyStatus);
router.get('/', verifyToken, getOrders);
router.get('/statuses', verifyToken, getOrderStatuses);
router.get('/:id/receipts/:receiptId/image', verifyToken, getPaymentReceiptImage);
router.put('/:id', verifyToken, updateOrder);
router.patch('/:id/cancel', verifyToken, cancelOrder);
router.post('/:id/payment-receipt', verifyToken, uploadPaymentReceipt);

export default router;


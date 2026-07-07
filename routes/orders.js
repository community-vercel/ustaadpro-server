import express from 'express';
import {
  cancelOrder,
  checkout,
  getOrders,
  updateOrder,
  uploadPaymentReceipt,
} from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/checkout', verifyToken, checkout);
router.get('/', verifyToken, getOrders);
router.put('/:id', verifyToken, updateOrder);
router.patch('/:id/cancel', verifyToken, cancelOrder);
router.post('/:id/payment-receipt', verifyToken, uploadPaymentReceipt);

export default router;




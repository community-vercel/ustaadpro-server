import express from 'express';
import {
  checkoutShopOrder,
  getMyShopOrders,
  getShopProducts,
} from '../controllers/shopController.js';
import {verifyToken} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/products', getShopProducts);
router.get('/orders', verifyToken, getMyShopOrders);
router.post('/checkout', verifyToken, checkoutShopOrder);

export default router;

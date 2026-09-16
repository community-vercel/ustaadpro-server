import express from 'express';
import {
  checkoutShopOrder,
  getMyShopOrders,
  getShopProducts,
  getShopBrands,
  cancelShopOrder,
} from '../controllers/shopController.js';
import {verifyToken} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/products', getShopProducts);
router.get('/brands', getShopBrands);
router.get('/orders', verifyToken, getMyShopOrders);
router.post('/checkout', verifyToken, checkoutShopOrder);
router.patch('/orders/:id/cancel', verifyToken, cancelShopOrder);

export default router;

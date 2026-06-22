import express from 'express';
import {
  createAdminService,
  getAdminHomeSlides,
  getAdminOrderById,
  getAdminOrders,
  getAdminServices,
  getAdminSettings,
  getAdminSummary,
  getAdminUsers,
  saveAdminHomeSlide,
  sendBroadcastNotification,
  uploadAdminImage,
  updateAdminOrderStatus,
  updateAdminSettings,
  updateAdminService,
  getAdminSubscriptions,
  createAdminSubscription,
  updateAdminSubscription,
  deleteAdminSubscription,
} from '../controllers/adminController.js';
import {
  getAdminShopOrders,
  getAdminShopProducts,
  saveAdminShopProduct,
  updateAdminShopOrderStatus,
} from '../controllers/shopController.js';

const router = express.Router();

router.get('/summary', getAdminSummary);
router.post('/notifications/broadcast', sendBroadcastNotification);
router.post('/uploads', uploadAdminImage);
router.get('/users', getAdminUsers);
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/status', updateAdminOrderStatus);
router.get('/services', getAdminServices);
router.post('/services', createAdminService);
router.put('/services/:id', updateAdminService);
router.get('/home-slides', getAdminHomeSlides);
router.post('/home-slides', saveAdminHomeSlide);
router.put('/home-slides/:id', saveAdminHomeSlide);
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

router.get('/subscriptions', getAdminSubscriptions);
router.post('/subscriptions', createAdminSubscription);
router.put('/subscriptions/:id', updateAdminSubscription);
router.delete('/subscriptions/:id', deleteAdminSubscription);

router.get('/shop/products', getAdminShopProducts);
router.post('/shop/products', saveAdminShopProduct);
router.put('/shop/products/:id', saveAdminShopProduct);
router.get('/shop/orders', getAdminShopOrders);
router.patch('/shop/orders/:id/status', updateAdminShopOrderStatus);

export default router;

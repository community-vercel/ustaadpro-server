import express from 'express';
import {
  createAdminService,
  getAdminHomeSlides,
  getAdminOrderById,
  getAdminOrders,
  getAdminPaymentReceipts,
  updateAdminPaymentReceiptStatus,
  getAdminServices,
  getAdminCatalogue,
  saveAdminCategory,
  saveAdminSubcategory,
  getAdminSettings,
  getAdminSummary,
  getAdminUsers,
  deleteAdminUser,
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
  loginAdmin,
  importAdminCatalog,
  deleteAdminCategory,
  deleteAdminSubcategory,
  deleteAdminService,
  deleteAdminHomeSlide,
} from '../controllers/adminController.js';
import {
  getAdminShopOrders,
  getAdminShopProducts,
  saveAdminShopProduct,
  updateAdminShopOrderStatus,
} from '../controllers/shopController.js';

const router = express.Router();

router.post('/auth/login', loginAdmin);
router.get('/summary', getAdminSummary);
router.post('/notifications/broadcast', sendBroadcastNotification);
router.post('/uploads', uploadAdminImage);
router.get('/users', getAdminUsers);
router.delete('/users/:id', deleteAdminUser);
router.get('/orders', getAdminOrders);
router.get('/payment-receipts', getAdminPaymentReceipts);
router.patch('/payment-receipts/:id/status', updateAdminPaymentReceiptStatus);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/status', updateAdminOrderStatus);
router.get('/catalogue', getAdminCatalogue);
router.post('/catalogue/import', importAdminCatalog);
router.post('/categories', saveAdminCategory);
router.post('/subcategories', saveAdminSubcategory);
router.delete('/categories/:id', deleteAdminCategory);
router.delete('/subcategories/:id', deleteAdminSubcategory);
router.get('/services', getAdminServices);
router.post('/services', createAdminService);
router.put('/services/:id', updateAdminService);
router.delete('/services/:id', deleteAdminService);
router.get('/home-slides', getAdminHomeSlides);
router.post('/home-slides', saveAdminHomeSlide);
router.put('/home-slides/:id', saveAdminHomeSlide);
router.delete('/home-slides/:id', deleteAdminHomeSlide);
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




import express from 'express';
import {
  getAppSettings,
  getCategories,
  getHomeSlides,
  getServiceById,
  getServices,
  getSubcategories,
  getSubscriptions,
} from '../controllers/serviceController.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/categories/:categoryId/subcategories', getSubcategories);
router.get('/services', getServices);
router.get('/services/:id', getServiceById);
router.get('/subscriptions', getSubscriptions);
router.get('/home-slides', getHomeSlides);
router.get('/settings', getAppSettings);

export default router;

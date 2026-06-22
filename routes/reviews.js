import express from 'express';
import {
  createServiceReview,
  getServiceReviews,
} from '../controllers/reviewController.js';
import {verifyToken} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/services/:serviceId/reviews', getServiceReviews);
router.post('/reviews', verifyToken, createServiceReview);

export default router;

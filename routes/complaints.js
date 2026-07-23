import express from 'express';
import {
  submitComplaint,
  getComplaints,
  updateComplaintStatus,
  getMyBookedServices,
} from '../controllers/complaintController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / User
router.post('/', submitComplaint);
router.get('/my-services', verifyToken, getMyBookedServices);

// Admin
router.get('/', getComplaints);
router.patch('/:id/status', updateComplaintStatus);

export default router;

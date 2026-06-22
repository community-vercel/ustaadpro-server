import express from 'express';
import {
  createAddress,
  getAddresses,
  updateAddress,
} from '../controllers/addressController.js';
import {verifyToken} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getAddresses);
router.post('/', verifyToken, createAddress);
router.put('/:id', verifyToken, updateAddress);

export default router;

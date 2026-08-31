import express from 'express';
import {
  signup,
  verifySignupOtp,
  login,
  loginWithPhone,
  requestLoginOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyLoginOtp,
  getProfile,
  updateWallet,
  saveFcmToken,
  deleteAccount,
  setPin,
  verifyPin,
  requestPinResetOtp,
  resetPinWithOtp,
} from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-signup-otp', verifySignupOtp);
router.post('/login', login);
router.post('/login-phone', loginWithPhone);
router.post('/request-login-otp', requestLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/forgot-password/request-otp', requestPasswordResetOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.post('/set-pin', verifyToken, setPin);
router.post('/verify-pin', verifyPin);
router.post('/forgot-pin/request-otp', requestPinResetOtp);
router.post('/forgot-pin/reset', resetPinWithOtp);
router.get('/profile', verifyToken, getProfile);
router.put('/wallet', verifyToken, updateWallet);
router.post('/fcm-token', verifyToken, saveFcmToken);
router.delete('/account', verifyToken, deleteAccount);

export default router;

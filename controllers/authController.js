import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuthOtp from '../models/AuthOtp.js';
import { sendOtpEmail } from '../utils/mailer.js';
import { sendOtpSms } from '../utils/sms.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'ustaadpro_super_secret_key_123!';
const SIGNUP_OTP_PURPOSE = 'signup';
const LOGIN_OTP_PURPOSE = 'login';
const FORGOT_PASSWORD_OTP_PURPOSE = 'forgot_password';
const OTP_EXPIRY_MINUTES = 10;

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    walletBalance: Number(user.walletBalance ?? user.wallet_balance),
    coins: user.coins,
    rewardPoints: Number(user.rewardPoints ?? user.reward_points ?? 0),
    createdAt: user.createdAt ?? user.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, phone: user.phone }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0092')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('92')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) {
    return '';
  }
  return `+92${digits}`;
}

function isMediumPassword(password) {
  const value = String(password || '');
  return value.length >= 6 && /[A-Z]/.test(value);
}

async function createOtp({identifier, purpose, payload}) {
  const salt = await bcrypt.genSalt(10);
  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, salt);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await AuthOtp.create({
    email: identifier,
    purpose,
    codeHash: otpHash,
    expiresAt,
    payload,
  });

  return otpCode;
}

async function sendOtp({channel, to, code, purpose}) {
  if (channel === 'phone') {
    await sendOtpSms({to, code, purpose});
    return;
  }

  await sendOtpEmail({to, code, purpose});
}

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password, verificationChannel = 'email' } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const channel = verificationChannel === 'phone' ? 'phone' : 'email';
    const otpIdentifier = channel === 'phone' ? normalizedPhone : normalizedEmail;

    if (!name || !phone || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Please enter a valid Pakistani phone number.' });
    }

    if (!isMediumPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters and include one uppercase letter.',
      });
    }

    const existingPhone = await User.findByPhone(normalizedPhone);
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone number already registered.' });
    }

    const existingEmail = await User.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otpCode = await createOtp({
      identifier: otpIdentifier,
      purpose: SIGNUP_OTP_PURPOSE,
      payload: {
        name: name.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        password: hashedPassword,
        verificationChannel: channel,
      },
    });

    await sendOtp({
      channel,
      to: otpIdentifier,
      code: otpCode,
      purpose: 'signup',
    });

    res.status(200).json({
      message: `Verification code sent to your ${channel}.`,
      email: normalizedEmail,
      phone: normalizedPhone,
      verificationChannel: channel,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error('Signup OTP error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, phone, code, verificationChannel = 'email' } = req.body;
    const channel = verificationChannel === 'phone' ? 'phone' : 'email';
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const otpIdentifier = channel === 'phone' ? normalizedPhone : normalizedEmail;

    if (!otpIdentifier || !code) {
      return res.status(400).json({ message: 'Phone/email and verification code are required.' });
    }

    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ message: 'Verification code must be 6 digits.' });
    }

    const otpRecord = await AuthOtp.findLatestActive(otpIdentifier, SIGNUP_OTP_PURPOSE);
    if (!otpRecord) {
      return res.status(400).json({ message: 'Verification code not found or already used.' });
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    if (otpRecord.attempts >= 5) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    }

    const isValidCode = await bcrypt.compare(String(code), otpRecord.code_hash);
    if (!isValidCode) {
      await AuthOtp.incrementAttempts(otpRecord.id);
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    const payload = typeof otpRecord.payload === 'string' ? JSON.parse(otpRecord.payload) : otpRecord.payload;

    const existingPhone = await User.findByPhone(payload.phone);
    if (existingPhone) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Phone number already registered.' });
    }

    const existingEmail = await User.findByEmail(payload.email);
    if (existingEmail) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Email address already registered.' });
    }

    const userId = await User.create({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      password: payload.password,
    });

    const user = await User.findById(userId);
    await AuthOtp.consume(otpRecord.id);

    const token = signToken(user);

    res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Signup OTP verification error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user);

    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const loginWithPhone = async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Please enter a valid Pakistani phone number.' });
    }

    const user = await User.findByPhone(normalizedPhone);
    if (!user) {
      return res.status(404).json({ message: 'Phone number is not registered.' });
    }

    const token = signToken(user);
    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const requestLoginOtp = async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Please enter a valid Pakistani phone number.' });
    }

    const user = await User.findByPhone(normalizedPhone);
    if (!user) {
      return res.status(404).json({ message: 'Phone number is not registered.' });
    }

    const otpCode = await createOtp({
      identifier: normalizedPhone,
      purpose: LOGIN_OTP_PURPOSE,
      payload: {phone: normalizedPhone},
    });

    await sendOtpSms({
      to: normalizedPhone,
      code: otpCode,
      purpose: 'login',
    });

    res.status(200).json({
      message: 'Login code sent to your phone.',
      phone: normalizedPhone,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error('Login OTP request error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);
    const { code } = req.body;

    if (!normalizedPhone || !code) {
      return res.status(400).json({ message: 'Phone number and verification code are required.' });
    }

    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ message: 'Verification code must be 6 digits.' });
    }

    const otpRecord = await AuthOtp.findLatestActive(normalizedPhone, LOGIN_OTP_PURPOSE);
    if (!otpRecord) {
      return res.status(400).json({ message: 'Verification code not found or already used.' });
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    if (otpRecord.attempts >= 5) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    }

    const isValidCode = await bcrypt.compare(String(code), otpRecord.code_hash);
    if (!isValidCode) {
      await AuthOtp.incrementAttempts(otpRecord.id);
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    const user = await User.findByPhone(normalizedPhone);
    if (!user) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(404).json({ message: 'Phone number is not registered.' });
    }

    await AuthOtp.consume(otpRecord.id);
    const token = signToken(user);

    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const requestPasswordResetOtp = async (req, res) => {
  try {
    const channel = req.body.channel === 'phone' ? 'phone' : 'email';
    const normalizedEmail = normalizeEmail(req.body.email);
    const normalizedPhone = normalizePhone(req.body.phone);
    const identifier = channel === 'phone' ? normalizedPhone : normalizedEmail;

    if (!identifier) {
      return res.status(400).json({
        message:
          channel === 'phone'
            ? 'Please enter a valid Pakistani phone number.'
            : 'Please enter a valid email address.',
      });
    }

    const user =
      channel === 'phone'
        ? await User.findByPhone(identifier)
        : await User.findByEmail(identifier);

    if (!user) {
      return res.status(404).json({
        message:
          channel === 'phone'
            ? 'Phone number is not registered.'
            : 'Email address is not registered.',
      });
    }

    const otpCode = await createOtp({
      identifier,
      purpose: FORGOT_PASSWORD_OTP_PURPOSE,
      payload: {
        userId: user.id,
        channel,
        email: user.email,
        phone: user.phone,
      },
    });

    await sendOtp({
      channel,
      to: identifier,
      code: otpCode,
      purpose: 'password reset',
    });

    res.status(200).json({
      message: `Password reset code sent to your ${channel}.`,
      verificationChannel: channel,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error('Password reset OTP request error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const {
      channel: requestedChannel = 'email',
      email,
      phone,
      code,
      newPassword,
    } = req.body;
    const channel = requestedChannel === 'phone' ? 'phone' : 'email';
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const identifier = channel === 'phone' ? normalizedPhone : normalizedEmail;

    if (!identifier || !code || !newPassword) {
      return res.status(400).json({
        message: 'Identifier, verification code, and new password are required.',
      });
    }

    if (!isMediumPassword(newPassword)) {
      return res
        .status(400)
        .json({
          message: 'Password must be at least 6 characters and include one uppercase letter.',
        });
    }

    if (!/^\d{6}$/.test(String(code))) {
      return res
        .status(400)
        .json({ message: 'Verification code must be 6 digits.' });
    }

    const otpRecord = await AuthOtp.findLatestActive(
      identifier,
      FORGOT_PASSWORD_OTP_PURPOSE,
    );

    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: 'Verification code not found or already used.' });
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    if (otpRecord.attempts >= 5) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(400).json({
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    const isValidCode = await bcrypt.compare(String(code), otpRecord.code_hash);
    if (!isValidCode) {
      await AuthOtp.incrementAttempts(otpRecord.id);
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    const payload =
      typeof otpRecord.payload === 'string'
        ? JSON.parse(otpRecord.payload)
        : otpRecord.payload;
    const user =
      payload?.userId
        ? await User.findById(payload.userId)
        : channel === 'phone'
          ? await User.findByPhone(identifier)
          : await User.findByEmail(identifier);

    if (!user) {
      await AuthOtp.consume(otpRecord.id);
      return res.status(404).json({ message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.updatePassword(user.id, hashedPassword);
    await AuthOtp.consume(otpRecord.id);

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Password reset verification error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    user.walletBalance = Number(user.walletBalance);
    user.rewardPoints = Number(user.rewardPoints ?? 0);
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateWallet = async (req, res) => {
  try {
    const { amount, coins } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const currentBalance = Number(user.walletBalance);
    const newBalance = currentBalance + (amount || 0);
    const newCoins = user.coins + (coins || 0);

    if (newBalance < 0) {
      return res.status(400).json({ message: 'Insufficient wallet balance.' });
    }

    await User.updateWallet(req.user.id, newBalance, newCoins);

    res.json({
      message: 'Wallet updated successfully',
      walletBalance: newBalance,
      coins: newCoins
    });
  } catch (error) {
    console.error('Wallet update error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    await User.updateFcmToken(req.user.id, token);
    res.json({ message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

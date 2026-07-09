import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Route files
import authRoutes from './routes/auth.js';
import serviceRoutes from './routes/services.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';
import adminRoutes from './routes/admin.js';
import shopRoutes from './routes/shop.js';
import reviewRoutes from './routes/reviews.js';

// ═══════════════ WHATSAPP-BOT ROUTES ═══════════════
import botServiceRoutes from './routes/botserviceRoutes.js';
import botBookingRoutes from './routes/botbookingRoutes.js';
import botSessionRoutes from './routes/botsessionRoutes.js';
import botStatsRoutes from './routes/botstatsRoutes.js';

import AppControl from './models/AppControl.js';
import Shop from './models/Shop.js';
import { initFirebase } from './utils/firebase.js';
import db from './config/db.js';
import botRoutes from './routes/botRoutes.js';

// Initialize Firebase
initFirebase();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ═══════════════ WHATSAPP-BOT ROUTES ═══════════════
app.use('/api/bot', botRoutes);
app.use('/api/bot/services', botServiceRoutes);
app.use('/api/bookings', botBookingRoutes);
app.use('/api/sessions', botSessionRoutes);
app.use('/api/stats', botStatsRoutes);


// ═══════════════ USTADPRO ROUTES ═══════════════
app.use('/api/auth', authRoutes);
app.use('/api', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reviewRoutes);


// ═══════════════ WHATSAPP-BOT FRONTEND ═══════════════
app.use('/admin', express.static(path.join(__dirname, 'frontend')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Root test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to UstaadPro API server.' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'PostgreSQL'
  });
});

// DB test
app.get('/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) FROM services');

    res.json({
      connected: true,
      database: process.env.DB_NAME || 'ustaadpro_db',
      servicesCount: Number(rows[0].count),
    });
  } catch (error) {
    console.error('DB test failed:', error);
    res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

try {
  await AppControl.ensureSchema();
  await Shop.ensureTables();
  console.log('Dynamic app control schema is ready.');
} catch (error) {
  console.error('Could not initialize dynamic app control schema:', error);
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

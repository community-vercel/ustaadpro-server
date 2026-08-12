import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import {createHash} from 'node:crypto';
import pool from '../config/db.js';
import Order from '../models/Order.js';
import Service from '../models/Service.js';
import AppControl from '../models/AppControl.js';
import Subscription from '../models/Subscription.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import PaymentReceipt from '../models/PaymentReceipt.js';
import { getFirebaseMessaging } from '../utils/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads');

async function ensureAdminCredentialsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'superadmin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export const loginAdmin = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res
        .status(400)
        .json({message: 'Email and password are required.'});
    }

    await ensureAdminCredentialsTable();

    const [admins] = await pool.query(
      'SELECT id, email, password_hash, role FROM admin_credentials WHERE email = ?',
      [email],
    );
    const admin = admins[0];
    const isValidPassword = admin
      ? await bcrypt.compare(password, admin.password_hash)
      : false;

    if (!admin || !isValidPassword) {
      return res.status(401).json({message: 'Invalid email or password.'});
    }

    res.json({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

async function populateAdminOrder(order) {
  const [items] = await pool.query(
    `SELECT oi.quantity, oi.price, oi.service_work_price_id as serviceWorkPriceId,
            oi.service_work_title as serviceWorkTitle, s.id as serviceId, s.title,
            s.description, s.duration, s.category_id as categoryId,
            s.service_type as serviceType, s.image_url as imageUrl,
            s.detail_description as detailDescription, s.details
     FROM order_items oi
     JOIN services s ON oi.service_id = s.id
     WHERE oi.order_id = ?`,
    [order.id],
  );

  const rawInstructions = String(order.specialInstructions || '');
  const legacyRewardPattern = /\s*\[8-Order Loyalty Reward:[^\]]*\]\s*/gi;
  const legacyRewardApplied = legacyRewardPattern.test(rawInstructions);
  const legacyFinalMatch = rawInstructions.match(/Final Total:\s*Rs\s*([\d,]+(?:\.\d+)?)/i);
  const storedDiscount = Number(order.rewardDiscount || 0);
  const rewardDiscount = storedDiscount || (legacyRewardApplied ? 200 : 0);
  const originalTotal = Number(order.originalTotal ?? order.total);
  const finalTotal = legacyFinalMatch
    ? Number(legacyFinalMatch[1].replace(/,/g, ''))
    : Number(order.total);
  const legacyTax = legacyRewardApplied && storedDiscount === 0
    ? Math.max(0, Number(order.tax || 0) - Math.max(0, originalTotal - finalTotal - rewardDiscount))
    : Number(order.tax);
  const servicesSubtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );

  return {
    ...order,
    specialInstructions: rawInstructions.replace(legacyRewardPattern, ' ').replace(/\s+/g, ' ').trim(),
    total: finalTotal,
    inspectionFee: Number(order.inspectionFee),
    tax: legacyTax,
    rewardPointsEarned: Number(order.rewardPointsEarned || 0),
    rewardPointsRedeemed: Number(order.rewardPointsRedeemed || 0),
    walletUsed: Number(order.walletUsed || 0),
    rewardDiscount,
    loyaltyDiscount: rewardDiscount,
    discount: rewardDiscount,
    originalTotal,
    servicesSubtotal,
    platformCharges: legacyTax,
    amountPayable: finalTotal,
    billingBreakdown: {
      servicesSubtotal,
      inspectionFee: Number(order.inspectionFee),
      platformCharges: legacyTax,
      originalTotal,
      discount: rewardDiscount,
      amountPayable: finalTotal,
    },
    items: items.map(item => ({
      ...item,
      price: Number(item.price),
      imageUrl: item.imageUrl || '',
      details:
        typeof item.details === 'string'
          ? JSON.parse(item.details || '[]')
          : item.details || [],
    })),
  };
}

export const getAdminSummary = async (_req, res) => {
  try {
    const [[orders]] = await pool.query(
      'SELECT COUNT(*) as totalOrders, COALESCE(SUM(total), 0) as revenue FROM orders',
    );
    const [[customers]] = await pool.query(
      'SELECT COUNT(*) as totalCustomers FROM users',
    );
    const [[services]] = await pool.query(
      'SELECT COUNT(*) as totalServices FROM services',
    );
    const [[active]] = await pool.query(
      "SELECT COUNT(*) as activeOrders FROM orders WHERE status NOT IN ('completed', 'cancelled')",
    );

    res.json({
      totalOrders: Number(orders.totalOrders),
      revenue: Number(orders.revenue),
      totalCustomers: Number(customers.totalCustomers),
      totalServices: Number(services.totalServices),
      activeOrders: Number(active.activeOrders),
    });
  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminOrders = async (_req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.total, o.status, o.booked_for as bookedFor,
              o.payment_method as paymentMethod, o.address,
              o.special_instructions as specialInstructions,
              o.cancel_reason as cancelReason,
              o.inspection_fee as inspectionFee, o.tax,
              o.reward_points_earned as rewardPointsEarned,
              o.reward_points_redeemed as rewardPointsRedeemed,
              o.reward_discount as rewardDiscount,
              o.wallet_used as walletUsed,
              o.original_total as originalTotal,
              o.created_at as createdAt,
              u.name as customerName, u.phone as customerPhone, u.email as customerEmail
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`,
    );

    const populated = [];
    for (const order of orders) {
      populated.push(await populateAdminOrder(order));
    }

    res.json(populated);
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminOrderById = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.total, o.status, o.booked_for as bookedFor,
              o.payment_method as paymentMethod, o.address,
              o.special_instructions as specialInstructions,
              o.cancel_reason as cancelReason,
              o.inspection_fee as inspectionFee, o.tax,
              o.reward_points_earned as rewardPointsEarned,
              o.reward_points_redeemed as rewardPointsRedeemed,
              o.reward_discount as rewardDiscount,
              o.wallet_used as walletUsed,
              o.original_total as originalTotal,
              o.created_at as createdAt,
              u.name as customerName, u.phone as customerPhone, u.email as customerEmail
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [req.params.id],
    );

    if (!orders[0]) {
      return res.status(404).json({message: 'Order not found.'});
    }

    res.json(await populateAdminOrder(orders[0]));
  } catch (error) {
    console.error('Admin order detail error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateAdminOrderStatus = async (req, res) => {
  try {
    const {status, cancelReason} = req.body;
    const allowed = [
      'checking_receipt',
      'confirmed',
      'assigned',
      'in_progress',
      'completed',
      'cancelled',
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({message: 'Invalid order status.'});
    }

    await Order.updateStatus(req.params.id, status, cancelReason);

    const [orders] = await pool.query(
      'SELECT user_id, payment_method as paymentMethod FROM orders WHERE id = ?',
      [req.params.id],
    );
    const order = orders[0];
    if (order) {
      const [users] = await pool.query(
        'SELECT fcm_token as fcmToken FROM users WHERE id = ?',
        [order.user_id],
      );
      const fcmToken = users[0]?.fcmToken;
      const messaging = getFirebaseMessaging();
      const [payments] = await pool.query('SELECT COALESCE(SUM(amount), 0) as paid FROM payment_receipts WHERE order_id = ?', [req.params.id]);
      const paid = Number(payments[0]?.paid || 0);
      const requiresRemainingPayment = status === 'completed' && order.paymentMethod === 'Rs 200 Advance' && paid > 0;

      if (fcmToken && messaging) {
        try {
          await messaging.send({
            token: fcmToken,
            android: {
              priority: 'high',
              notification: {
                channelId: 'order_updates',
                icon: 'ic_notification',
                color: '#006C49',
                sound: 'default',
              },
            },
            notification: {
              title: requiresRemainingPayment ? 'Remaining payment due' : status === 'completed' ? 'Work completed' : 'Order Status Updated',
              body: requiresRemainingPayment
                ? 'Your Rs. 200 advance was received. Please pay and upload the remaining EasyPaisa balance.'
                : status === 'completed'
                ? 'Your work has been completed.'
                : `Your order status is now: ${status.replace('_', ' ').toUpperCase()}`,
            },
            data: {
              type: requiresRemainingPayment ? 'payment_request' : 'service_order',
              orderId: req.params.id,
              status,
              accountNumber: '03485838593',
              accountTitle: 'Muhammad Ikram',
              paymentMethod: order.paymentMethod || '',
            },
          });
          console.log(`Push notification sent to user ${order.user_id} for order ${req.params.id}`);
        } catch (pushError) {
          console.error('Failed to send push notification:', pushError);
        }
      }
    }

    res.json({message: 'Order status updated.', id: req.params.id, status});
  } catch (error) {
    console.error('Admin order status error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const sendBroadcastNotification = async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const message = String(req.body.message || '').trim();

    if (!title || !message) {
      return res
        .status(400)
        .json({message: 'Notification title and message are required.'});
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return res.status(503).json({
        message: 'Firebase Admin SDK is not configured on the server.',
        sentCount: 0,
        failedCount: 0,
        targetCount: 0,
      });
    }

    const [users] = await pool.query(
      `SELECT id, fcm_token as fcmToken
       FROM users
       WHERE fcm_token IS NOT NULL AND fcm_token != ''`,
    );
    const tokens = [...new Set(users.map(user => user.fcmToken).filter(Boolean))];

    if (tokens.length === 0) {
      return res.json({
        message: 'No user devices have notification tokens yet.',
        sentCount: 0,
        failedCount: 0,
        targetCount: 0,
      });
    }

    const notificationId = `broadcast-${Date.now()}`;
    let sentCount = 0;
    let failedCount = 0;

    for (let index = 0; index < tokens.length; index += 100) {
      const tokenBatch = tokens.slice(index, index + 100);
      const results = await Promise.allSettled(
        tokenBatch.map((token, tokenIndex) =>
          messaging.send({
            token,
            android: {
              priority: 'high',
              notification: {
                channelId: 'order_updates',
                icon: 'ic_notification',
                color: '#006C49',
                sound: 'default',
              },
            },
            notification: {
              title,
              body: message,
            },
            data: {
              type: 'broadcast',
              notificationId: `${notificationId}-${index + tokenIndex}`,
            },
          }),
        ),
      );

      sentCount += results.filter(result => result.status === 'fulfilled').length;
      failedCount += results.filter(result => result.status === 'rejected').length;
      results
        .filter(result => result.status === 'rejected')
        .slice(0, 5)
        .forEach(result => {
          console.error('Broadcast token send failed:', result.reason?.message || result.reason);
        });
    }

    res.json({
      message: `Broadcast sent to ${sentCount} device${sentCount === 1 ? '' : 's'}.`,
      sentCount,
      failedCount,
      targetCount: tokens.length,
    });
  } catch (error) {
    console.error('Admin broadcast notification error:', error);
    res.status(500).json({message: error?.message || 'Could not send broadcast notification.'});
  }
};

export const updateAdminPaymentReceiptStatus = async (req, res) => {
  try {
    await PaymentReceipt.updateStatusAndCredit(Number(req.params.id), req.body?.status);
    res.json({message: 'Receipt status updated. Verified cancelled payments are credited to the wallet once.'});
  } catch (error) { res.status(error.statusCode || 500).json({message: error.message || 'Could not update receipt.'}); }
};
export const getAdminPaymentReceipts = async (_req, res) => {
  try {
    const receipts = await PaymentReceipt.getAdminAll();
    res.json(receipts);
  } catch (error) {
    console.error('Admin payment receipts error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};
const catalogueId = value => String(value || '').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const catalogText = value => String(value ?? '').trim();
const catalogSlug = value => catalogText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const catalogId = (prefix, values) => `${prefix}-${createHash('sha1').update(values.join('|')).digest('hex').slice(0, 14)}`;
const catalogValue = (row, ...keys) => keys.map(key => catalogText(row[key])).find(Boolean) || '';

function parseCatalogWorkbook(dataUrl) {
  const match = String(dataUrl || '').match(/^data:application\/(?:vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-excel);base64,(.+)$/i);
  if (!match) throw new Error('Upload an .xlsx spreadsheet.');
  const workbook = xlsx.read(Buffer.from(match[1], 'base64'), {type: 'buffer'});
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, {defval: ''});
  const required = ['Main Category', 'Service', 'Price (PKR)', 'Unit/Description'];
  const headers = Object.keys(rawRows[0] || {});
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);

  return rawRows.map((row, index) => ({
    row: index + 2,
    mainCategory: catalogValue(row, 'Main Category'),
    mobileIconUrl: catalogValue(row, 'main category icon for  moible', 'main category icon for mobile'),
    webImageUrl: catalogValue(row, 'main category images for  web / desktop'),
    subcategory: catalogValue(row, 'Sub Category'),
    subcategoryImageUrl: catalogValue(row, 'Sub category Image'),
    title: catalogValue(row, 'Service'),
    price: Number(String(row['Price (PKR)'] ?? 0).replace(/,/g, '')) || 0,
    unitDescription: catalogValue(row, 'Unit/Description'),
    imageUrl: catalogValue(row, 'Services Images'),
  })).filter(row => row.mainCategory && row.title);
}

async function importCatalogRows(rows) {
  await AppControl.ensureSchema();
  for (const row of rows) {
    const categoryId = catalogSlug(row.mainCategory);
    await pool.query(
      `INSERT INTO categories (id, title, subtitle, icon, tint, web_image_url, mobile_icon_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title,
       web_image_url = COALESCE(NULLIF(EXCLUDED.web_image_url, ''), categories.web_image_url),
       mobile_icon_url = COALESCE(NULLIF(EXCLUDED.mobile_icon_url, ''), categories.mobile_icon_url)`,
      [categoryId, row.mainCategory, `Professional ${row.mainCategory} services`, 'tool', '#006C49', row.webImageUrl, row.mobileIconUrl],
    );
    const subcategoryId = row.subcategory ? catalogId('sub', [categoryId, row.subcategory]) : null;
    if (subcategoryId) {
      await pool.query(
        `INSERT INTO subcategories (id, category_id, title, description, web_image_url, mobile_icon_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title,
         web_image_url = COALESCE(NULLIF(EXCLUDED.web_image_url, ''), subcategories.web_image_url),
         mobile_icon_url = COALESCE(NULLIF(EXCLUDED.mobile_icon_url, ''), subcategories.mobile_icon_url)`,
        [subcategoryId, categoryId, row.subcategory, `${row.subcategory} services`, row.subcategoryImageUrl, row.subcategoryImageUrl],
      );
    }
    const serviceId = catalogId('svc', [categoryId, subcategoryId || 'direct', row.title]);
    const description = row.unitDescription || `${row.title} service`;
    await pool.query(
      `INSERT INTO services (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, service_type, image_url, detail_description, details, includes, excludes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
       price = EXCLUDED.price, original_price = EXCLUDED.original_price, service_type = EXCLUDED.service_type,
       image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), services.image_url), detail_description = EXCLUDED.detail_description`,
      [serviceId, categoryId, subcategoryId, row.title, description, row.price, row.price, '60 min', 0, 0, null, row.unitDescription || 'Standard Visit', row.imageUrl, description, JSON.stringify([row.unitDescription].filter(Boolean)), '[]', '[]'],
    );
  }
}

export const importAdminCatalog = async (req, res) => {
  try {
    const rows = parseCatalogWorkbook(req.body?.dataUrl);
    const summary = {
      rows: rows.length,
      categories: [...new Set(rows.map(row => row.mainCategory))],
      subcategories: [...new Set(rows.map(row => `${row.mainCategory}|${row.subcategory || '(direct)'}`))].length,
      preview: rows.slice(0, 10),
    };
    if (req.body?.commit === true) {
      await importCatalogRows(rows);
      summary.imported = true;
    }
    res.json(summary);
  } catch (error) {
    res.status(400).json({message: error.message || 'Catalog import failed.'});
  }
};
export const getAdminCatalogue = async (_req, res) => {
  try {
    await AppControl.ensureSchema();
    const categories = await Category.getAll();
    const subcategories = (await Promise.all(categories.map(category =>
      Subcategory.findByCategoryId(category.id)))).flat();
    res.json({categories, subcategories});
  } catch (error) {
    console.error('Admin catalogue error:', error);
    res.status(500).json({message: 'Could not load catalogue.'});
  }
};

export const saveAdminCategory = async (req, res) => {
  try {
    await AppControl.ensureSchema();
    const title = String(req.body?.title || '').trim();
    const id = catalogueId(req.body?.id || title);
    if (!id || !title) return res.status(400).json({message: 'Category title is required.'});
    await pool.query('INSERT INTO categories (id, title, subtitle, icon, tint, web_image_url, mobile_icon_url) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, icon = EXCLUDED.icon, tint = EXCLUDED.tint, web_image_url = EXCLUDED.web_image_url, mobile_icon_url = EXCLUDED.mobile_icon_url',
      [id, title, req.body?.subtitle || 'Explore services', req.body?.icon || 'tool', req.body?.tint || '#006C49', req.body?.webImageUrl || req.body?.web_image_url || null, req.body?.mobileIconUrl || req.body?.mobile_icon_url || null]);
    res.status(201).json({id, title});
  } catch (error) {
    console.error('Save admin category error:', error);
    res.status(500).json({message: 'Could not save main service.'});
  }
};

export const saveAdminSubcategory = async (req, res) => {
  try {
    await AppControl.ensureSchema();
    const categoryId = String(req.body?.categoryId || req.body?.category_id || '').trim();
    const title = String(req.body?.title || '').trim();
    const id = catalogueId(req.body?.id || categoryId + '-' + title);
    if (!categoryId || !title) return res.status(400).json({message: 'Main service and sub-service title are required.'});
    await pool.query('INSERT INTO subcategories (id, category_id, title, description, web_image_url, mobile_icon_url) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, title = EXCLUDED.title, description = EXCLUDED.description, web_image_url = EXCLUDED.web_image_url, mobile_icon_url = EXCLUDED.mobile_icon_url',
      [id, categoryId, title, req.body?.description || null, req.body?.webImageUrl || req.body?.web_image_url || null, req.body?.mobileIconUrl || req.body?.mobile_icon_url || null]);
    res.status(201).json({id, categoryId, title});
  } catch (error) {
    console.error('Save admin subcategory error:', error);
    res.status(500).json({message: 'Could not save sub-service.'});
  }
};

export const deleteAdminCategory = async (req, res) => {
  try {
    await AppControl.ensureSchema();
    const [orders] = await pool.query('SELECT COUNT(*)::int AS count FROM order_items oi JOIN services s ON s.id = oi.service_id WHERE s.category_id = ?', [req.params.id]);
    if (Number(orders[0]?.count || 0) > 0) return res.status(409).json({message: 'This category has booked services and cannot be deleted.'});
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({message: 'Category deleted.'});
  } catch (error) { res.status(500).json({message: error.message || 'Could not delete category.'}); }
};

export const deleteAdminSubcategory = async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT COUNT(*)::int AS count FROM order_items oi JOIN services s ON s.id = oi.service_id WHERE s.subcategory_id = ?', [req.params.id]);
    if (Number(orders[0]?.count || 0) > 0) return res.status(409).json({message: 'This subcategory has booked services and cannot be deleted.'});
    await pool.query('DELETE FROM subcategories WHERE id = ?', [req.params.id]);
    res.json({message: 'Subcategory deleted.'});
  } catch (error) { res.status(500).json({message: error.message || 'Could not delete subcategory.'}); }
};

export const deleteAdminService = async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT COUNT(*)::int AS count FROM order_items WHERE service_id = ?', [req.params.id]);
    if (Number(orders[0]?.count || 0) > 0) return res.status(409).json({message: 'This service has bookings and cannot be deleted.'});
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({message: 'Service deleted.'});
  } catch (error) { res.status(500).json({message: error.message || 'Could not delete service.'}); }
};
export const getAdminServices = async (_req, res) => {
  try {
    const services = await Service.getAll();
    res.json(services);
  } catch (error) {
    console.error('Admin services error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const createAdminService = async (req, res) => {
  try {
    const id = await Service.create(req.body);
    res.status(201).json({message: 'Service created.', id});
  } catch (error) {
    console.error('Admin create service error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateAdminService = async (req, res) => {
  try {
    await Service.update(req.params.id, req.body);
    res.json({message: 'Service updated.', id: req.params.id});
  } catch (error) {
    console.error('Admin update service error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const uploadAdminImage = async (req, res) => {
  try {
    const {dataUrl, filename = 'admin-upload.jpg'} = req.body;

    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({message: 'A valid image is required.'});
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({message: 'Invalid image format.'});
    }

    const mimeType = match[1];
    const base64 = match[2];
    const extension =
      mimeType
        .split('/')[1]
        ?.replace('jpeg', 'jpg')
        .replace(/[^a-z0-9]/gi, '') || 'jpg';
    const safeName = filename
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const storedName = `${Date.now()}-${safeName || 'image'}.${extension}`;

    await fs.mkdir(uploadDir, {recursive: true});
    await fs.writeFile(
      path.join(uploadDir, storedName),
      Buffer.from(base64, 'base64'),
    );

    res.status(201).json({url: `/uploads/${storedName}`});
  } catch (error) {
    console.error('Admin image upload error:', error);
    res.status(500).json({message: 'Could not upload image.'});
  }
};

export const getAdminUsers = async (_req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email,
              u.reward_points as rewardPoints,
              u.created_at as createdAt,
              COUNT(o.id) as totalOrders,
              COALESCE(SUM(o.total), 0) as totalSpend
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
    );

    res.json(
      users.map(user => ({
        ...user,
        rewardPoints: Number(user.rewardPoints || 0),
        totalOrders: Number(user.totalOrders),
        totalSpend: Number(user.totalSpend),
      })),
    );
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({message: 'A valid user id is required.'});
    }

    const [users] = await pool.query(
      'SELECT id, email, phone FROM users WHERE id = ?',
      [userId],
    );
    const user = users[0];

    if (!user) {
      return res.status(404).json({message: 'User not found.'});
    }

    await pool.query('DELETE FROM service_reviews WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM user_addresses WHERE user_id = ?', [userId]);
    await pool.query(
      'DELETE FROM shop_order_items WHERE order_id IN (SELECT id FROM shop_orders WHERE user_id = ?)',
      [userId],
    );
    await pool.query('DELETE FROM shop_orders WHERE user_id = ?', [userId]);
    await pool.query(
      'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)',
      [userId],
    );
    await pool.query('DELETE FROM orders WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM auth_otps WHERE email IN (?, ?)', [
      user.email,
      user.phone,
    ]);

    const [deleted] = await pool.query('DELETE FROM users WHERE id = ?', [
      userId,
    ]);

    res.json({
      message: 'User deleted.',
      id: userId,
      affectedRows: deleted.affectedRows || deleted.rowCount || 1,
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminHomeSlides = async (_req, res) => {
  try {
    const slides = await AppControl.getSlides({activeOnly: false});
    res.json(slides);
  } catch (error) {
    console.error('Admin home slides error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const saveAdminHomeSlide = async (req, res) => {
  try {
    const id = await AppControl.upsertSlide(req.body);
    res.json({message: 'Home header slide saved.', id});
  } catch (error) {
    console.error('Admin save home slide error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const deleteAdminHomeSlide = async (req, res) => {
  try {
    await AppControl.deleteSlide(req.params.id);
    res.json({message: 'Home header slide deleted.'});
  } catch (error) {
    console.error('Admin delete home slide error:', error);
    res.status(404).json({message: error.message || 'Home header slide was not found.'});
  }
};
export const getAdminSettings = async (_req, res) => {
  try {
    const settings = await AppControl.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Admin settings error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    const settings = await AppControl.updateSettings(req.body);
    res.json(settings);
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminSubscriptions = async (_req, res) => {
  try {
    const subs = await Subscription.getAll();
    res.json(subs);
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const createAdminSubscription = async (req, res) => {
  try {
    const id = await Subscription.create(req.body);
    res.status(201).json({message: 'Subscription created.', id});
  } catch (error) {
    console.error('Admin create subscription error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateAdminSubscription = async (req, res) => {
  try {
    await Subscription.update(req.params.id, req.body);
    res.json({message: 'Subscription updated.', id: req.params.id});
  } catch (error) {
    console.error('Admin update subscription error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const deleteAdminSubscription = async (req, res) => {
  try {
    await Subscription.delete(req.params.id);
    res.json({message: 'Subscription deleted.', id: req.params.id});
  } catch (error) {
    console.error('Admin delete subscription error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

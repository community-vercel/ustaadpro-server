import pool from '../config/db.js';
import AppControl from './AppControl.js';

function mapReceipt(row) {
  return {
    id: Number(row.id),
    orderId: row.order_id,
    userId: Number(row.user_id),
    receiptUrl: row.receipt_url,
    amount: Number(row.amount || 0),
    accountNumber: row.account_number,
    accountTitle: row.account_title,
    status: row.status || 'submitted',
    paymentStage: row.payment_stage || row.paymentStage || 'full',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    orderTotal: row.order_total !== undefined ? Number(row.order_total || 0) : undefined,
    orderStatus: row.order_status,
    bookedFor: row.booked_for,
    paymentMethod: row.payment_method,
    address: row.address,
    items: row.items || [],
  };
}

class PaymentReceipt {
  static async create({orderId, userId, receiptUrl, amount, accountNumber, accountTitle}) {
    await AppControl.ensureSchema();
    // Existing production databases may have been created before staged
    // payments. Make the migration idempotent at the write boundary.
    const [stageColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_receipts'
         AND COLUMN_NAME = 'payment_stage'`,
    );
    if (!stageColumns.length) {
      await pool.query(
        "ALTER TABLE payment_receipts ADD COLUMN payment_stage VARCHAR(30) NOT NULL DEFAULT 'full'",
      );
    }
    const [orders] = await pool.query(
      'SELECT id, status, total FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId],
    );

    const order = orders[0];
    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    // EasyPaisa receipts are submitted before a service visit. Keep accepting
    // them through the service lifecycle, but never for a cancelled order.
    if (order.status === 'cancelled') {
      const error = new Error('A receipt cannot be submitted for a cancelled booking.');
      error.statusCode = 400;
      throw error;
    }

    const [existing] = await pool.query('SELECT amount, payment_stage FROM payment_receipts WHERE order_id = ? AND user_id = ?', [orderId, userId]);
    const paid = existing.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const isAdvance = String((await pool.query('SELECT payment_method FROM orders WHERE id = ?', [orderId]))[0][0]?.payment_method || '') === 'Rs 200 Advance';
    const remaining = Math.max(0, Number(order.total) - paid);
    const paymentStage = isAdvance && !existing.length ? 'advance' : isAdvance ? 'remaining' : 'full';
    const expected = paymentStage === 'advance' ? Math.min(200, Number(order.total)) : remaining;
    if (Number(amount) !== expected) { const error = new Error('Payment amount must be Rs. ' + expected + '.'); error.statusCode = 400; throw error; }

    await pool.query(
      `INSERT INTO payment_receipts
       (order_id, user_id, receipt_url, amount, account_number, account_title, status, payment_stage)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)`,
      [
        orderId,
        userId,
        receiptUrl,
        Number(amount || order.total || 0),
        accountNumber,
        accountTitle,
        paymentStage,
      ],
    );
  }

  static async findLatestByUserOrderIds(userId, orderIds = []) {
    await AppControl.ensureSchema();
    // Existing production databases may have been created before staged
    // payments. Make the migration idempotent at the write boundary.
    const [stageColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_receipts'
         AND COLUMN_NAME = 'payment_stage'`,
    );
    if (!stageColumns.length) {
      await pool.query(
        "ALTER TABLE payment_receipts ADD COLUMN payment_stage VARCHAR(30) NOT NULL DEFAULT 'full'",
      );
    }
    if (!orderIds.length) return {};

    const placeholders = orderIds.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT pr.*
       FROM payment_receipts pr
       JOIN (
         SELECT order_id, MAX(id) as latest_id
         FROM payment_receipts
         WHERE user_id = ? AND order_id IN (${placeholders})
         GROUP BY order_id
       ) latest ON latest.latest_id = pr.id`,
      [userId, ...orderIds],
    );

    return rows.reduce((acc, row) => {
      acc[row.order_id] = mapReceipt(row);
      return acc;
    }, {});
  }

  static async getAdminAll() {
    await AppControl.ensureSchema();
    // Existing production databases may have been created before staged
    // payments. Make the migration idempotent at the write boundary.
    const [stageColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment_receipts'
         AND COLUMN_NAME = 'payment_stage'`,
    );
    if (!stageColumns.length) {
      await pool.query(
        "ALTER TABLE payment_receipts ADD COLUMN payment_stage VARCHAR(30) NOT NULL DEFAULT 'full'",
      );
    }
    const [rows] = await pool.query(
      `SELECT pr.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email,
              o.total as order_total, o.status as order_status, o.booked_for, o.payment_method, o.address
       FROM payment_receipts pr
       JOIN users u ON u.id = pr.user_id
       JOIN orders o ON o.id = pr.order_id
       ORDER BY pr.created_at DESC`,
    );

    const receipts = [];
    for (const row of rows) {
      const [items] = await pool.query(
        `SELECT oi.quantity, oi.price, oi.service_work_price_id as serviceWorkPriceId,
                oi.service_work_title as serviceWorkTitle,
                s.id as serviceId, s.title, s.description, s.duration, s.category_id as categoryId,
                s.service_type as serviceType, s.image_url as imageUrl
         FROM order_items oi
         JOIN services s ON oi.service_id = s.id
         WHERE oi.order_id = ?`,
        [row.order_id],
      );

      receipts.push(
        mapReceipt({
          ...row,
          items: items.map(item => ({
            serviceId: item.serviceId,
            title: item.title,
            description: item.description,
            duration: item.duration,
            categoryId: item.categoryId,
            serviceType: item.serviceType,
            serviceWorkPriceId: item.serviceWorkPriceId,
            serviceWorkTitle: item.serviceWorkTitle,
            imageUrl: item.imageUrl,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
          })),
        }),
      );
    }

    return receipts;
  }
}

export default PaymentReceipt;


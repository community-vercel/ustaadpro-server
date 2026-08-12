import pool from '../config/db.js';
import PaymentReceipt from './PaymentReceipt.js';
import AppControl from './AppControl.js';

function receiptForCustomer(receipt) {
  if (!receipt) return null;
  if (!String(receipt.receiptUrl || '').startsWith('data:image/')) return receipt;
  return {
    ...receipt,
    receiptUrl: `/api/orders/${encodeURIComponent(receipt.orderId)}/receipts/${receipt.id}/image`,
  };
}

class Order {
  static async getLoyaltyStatus(userId) {
    const [[status]] = await pool.query(
      `SELECT
         COALESCE(u.reward_points, 0) AS rewardPoints,
         COALESCE(u.wallet_balance, 0) AS walletBalance,
         (SELECT COUNT(*) FROM orders o
          WHERE o.user_id = u.id
            AND o.status = 'checking_receipt'
            AND o.reward_discount > 0) AS pendingRewardOrders
       FROM users u
       WHERE u.id = ?`, [userId],
    );
    const rewardPoints = Number(status?.rewardPoints || status?.rewardpoints || 0);
    const pendingRewardOrders = Number(status?.pendingRewardOrders || status?.pendingrewardorders || 0);
    return {
      rewardPoints,
      rewardValue: rewardPoints * 25,
      walletBalance: Number(status?.walletBalance || status?.walletbalance || 0),
      pointsRequired: 12,
      discountValue: 300,
      eligible: rewardPoints >= 12 && pendingRewardOrders === 0,
    };
  }

  static async create({
    id,
    userId,
    total,
    status = 'checking_receipt',
    bookedFor,
    paymentMethod,
    address,
    specialInstructions,
    inspectionFee,
    tax,
    rewardPointsEarned = 0,
    rewardPointsRedeemed = 0,
    rewardDiscount = 0,
    walletUsed = 0,
    originalTotal = null,
  }) {
    await pool.query(
      `INSERT INTO orders
       (id, user_id, total, status, booked_for, payment_method, address,
        special_instructions, inspection_fee, tax, reward_points_earned,
        reward_points_redeemed, reward_discount, wallet_used, original_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        total,
        status,
        bookedFor,
        paymentMethod,
        address,
        specialInstructions || null,
        inspectionFee,
        tax,
        rewardPointsEarned,
        rewardPointsRedeemed,
        rewardDiscount,
        walletUsed,
        originalTotal,
      ],
    );
    return id;
  }

  static async remove(id, userId) {
    await pool.query('DELETE FROM orders WHERE id = ? AND user_id = ?', [id, userId]);
  }
  static async addItems(orderId, items) {
    // items is an array of { serviceId, serviceWorkPriceId, serviceWorkTitle, quantity, price }
    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items
         (order_id, service_id, service_work_price_id, service_work_title, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.serviceId,
          item.serviceWorkPriceId || null,
          item.serviceWorkTitle || null,
          item.quantity,
          item.price,
        ],
      );
    }
  }

  static async findStatusesByUserId(userId) {
    await AppControl.ensureSchema();
    const [rows] = await pool.query(
      `SELECT o.id, o.status, o.payment_method as paymentMethod,
              MAX(CASE WHEN pr.payment_stage = 'advance' AND pr.status <> 'rejected' THEN 1 ELSE 0 END) as hasAdvance,
              MAX(CASE WHEN pr.payment_stage = 'remaining' AND pr.status <> 'rejected' THEN 1 ELSE 0 END) as hasRemaining
       FROM orders o
       LEFT JOIN payment_receipts pr ON pr.order_id = o.id AND pr.user_id = o.user_id
       WHERE o.user_id = ?
       GROUP BY o.id, o.status, o.payment_method, o.created_at
       ORDER BY o.created_at DESC`,
      [userId],
    );
    return rows.map(row => ({
      id: row.id,
      status: row.status,
      paymentMethod: row.paymentMethod,
      hasAdvance: Boolean(Number(row.hasAdvance || 0)),
      hasRemaining: Boolean(Number(row.hasRemaining || 0)),
    }));
  }
  static async findByUserId(userId) {
    const [orders] = await pool.query(
      `SELECT id, total, status, booked_for as bookedFor,
              payment_method as paymentMethod, address,
              special_instructions as specialInstructions,
              cancel_reason as cancelReason,
              inspection_fee as inspectionFee, tax,
              reward_points_earned as rewardPointsEarned,
              reward_points_redeemed as rewardPointsRedeemed,
              reward_discount as rewardDiscount,
              wallet_used as walletUsed, original_total as originalTotal,
              created_at as createdAt
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    const orderIds = orders.map(order => order.id);
    const receiptHistoryByOrderId = await PaymentReceipt.findByUserOrderIds(
      userId,
      orderIds,
    );
    const receiptsByOrderId = Object.fromEntries(
      Object.entries(receiptHistoryByOrderId).map(([orderId, receipts]) => [
        orderId,
        receipts[receipts.length - 1] || null,
      ]),
    );

    let allItems = [];
    if (orderIds.length) {
      const placeholders = orderIds.map(() => '?').join(', ');
      [allItems] = await pool.query(
        `SELECT oi.order_id as orderId, oi.quantity, oi.price,
                oi.service_work_price_id as serviceWorkPriceId,
                oi.service_work_title as serviceWorkTitle,
                s.id as service_id, s.title, s.description, s.duration, s.category_id,
                sr.id as review_id, sr.rating as review_rating, sr.comment as review_comment
         FROM order_items oi
         JOIN services s ON oi.service_id = s.id
         LEFT JOIN service_reviews sr
           ON sr.order_id = oi.order_id
          AND sr.service_id = oi.service_id
          AND sr.user_id = ?
         WHERE oi.order_id IN (${placeholders})`,
        [userId, ...orderIds],
      );
    }
    const itemsByOrderId = allItems.reduce((grouped, item) => {
      if (!grouped[item.orderId]) grouped[item.orderId] = [];
      grouped[item.orderId].push(item);
      return grouped;
    }, {});

    const populatedOrders = [];
    for (const order of orders) {
      const items = itemsByOrderId[order.id] || [];

      const cartItems = items.map(item => ({
        quantity: item.quantity,
        service: {
          id: item.service_id,
          title: item.title,
          description: item.description,
          price: Number(item.price), // use the item's snapped price
          selectedWorkPriceId: item.serviceWorkPriceId ? Number(item.serviceWorkPriceId) : undefined,
          selectedWorkTitle: item.serviceWorkTitle || undefined,
          duration: item.duration,
          categoryId: item.category_id,
        },
        review: item.review_id
          ? {
              id: item.review_id,
              rating: Number(item.review_rating),
              comment: item.review_comment,
            }
          : null,
      }));

      const rawInstructions = String(order.specialInstructions || '');
      const legacyRewardPattern = /\s*\[8-Order Loyalty Reward:[^\]]*\]\s*/gi;
      const legacyRewardApplied = legacyRewardPattern.test(rawInstructions);
      const legacyFinalMatch = rawInstructions.match(/Final Total:\s*Rs\s*([\d,]+(?:\.\d+)?)/i);
      const storedDiscount = Number(order.rewardDiscount || 0);
      const rewardDiscount = storedDiscount || (legacyRewardApplied ? 200 : 0);
      const finalTotal = legacyFinalMatch
        ? Number(legacyFinalMatch[1].replace(/,/g, ''))
        : Number(order.total);

      populatedOrders.push({
        ...order,
        specialInstructions: rawInstructions.replace(legacyRewardPattern, ' ').replace(/\s+/g, ' ').trim(),
        total: finalTotal,
        inspectionFee: Number(order.inspectionFee),
        tax: Number(order.tax),
        rewardPointsEarned: Number(order.rewardPointsEarned || 0),
        rewardPointsRedeemed: Number(order.rewardPointsRedeemed || 0),
        rewardDiscount,
        loyaltyDiscount: rewardDiscount,
        discount: rewardDiscount,
        walletUsed: Number(order.walletUsed || 0),
        originalTotal: Number(order.originalTotal ?? order.total),
        paymentReceipt: receiptForCustomer(receiptsByOrderId[order.id]),
        paymentReceipts: (receiptHistoryByOrderId[order.id] || []).map(receiptForCustomer),
        items: cartItems,
      });
    }

    return populatedOrders;
  }

  static async updateStatus(id, status, cancelReason = null) {
    const [orders] = await pool.query(
      `SELECT user_id as userId, status, reward_points_earned as rewardPointsEarned,
              reward_points_redeemed as rewardPointsRedeemed
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    const order = orders[0];

    if (status === 'completed') {
      await pool.query(
        'UPDATE orders SET status = ?, cancel_reason = NULL WHERE id = ?',
        [status, id],
      );

      if (
        order &&
        order.status !== 'completed' &&
        Number(order.rewardPointsEarned || 0) === 0
      ) {
        const settings = await AppControl.getSettings();
        const points =
          settings.rewardEnabled === false
            ? 0
            : Math.max(
                0,
                Number(settings.serviceRewardPointsOnCompletion || 0),
              );

        if (points > 0) {
          await pool.query(
            'UPDATE users SET reward_points = COALESCE(reward_points, 0) + ? WHERE id = ?',
            [points, order.userId],
          );
          await pool.query(
            'UPDATE orders SET reward_points_earned = ? WHERE id = ?',
            [points, id],
          );
        }
      }
      return;
    }

    if (status === 'cancelled') {
      await pool.query(
        'UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?',
        [status, cancelReason, id],
      );

      if (order && order.status !== 'cancelled') {
        const adjustment =
          Number(order.rewardPointsRedeemed || 0) -
          Number(order.rewardPointsEarned || 0);

        if (adjustment) {
          await pool.query(
            'UPDATE users SET reward_points = GREATEST(0, COALESCE(reward_points, 0) + ?) WHERE id = ?',
            [adjustment, order.userId],
          );
        }
      }
      if (order) await PaymentReceipt.creditVerifiedCancellation(id, order.userId);
      return;
    }

    await pool.query(
      'UPDATE orders SET status = ?, cancel_reason = NULL WHERE id = ?',
      [status, id],
    );
  }

  static async findOwnedById(id, userId) {
    const [orders] = await pool.query(
      `SELECT id, status, user_id as userId,
              reward_points_earned as rewardPointsEarned,
              reward_points_redeemed as rewardPointsRedeemed,
              reward_discount as rewardDiscount
       FROM orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId],
    );

    return orders[0] || null;
  }

  static async updateCustomerDetails(id, userId, {address, specialInstructions}) {
    await pool.query(
      'UPDATE orders SET address = ?, special_instructions = ? WHERE id = ? AND user_id = ?',
      [address, specialInstructions || null, id, userId],
    );
  }

  static async updateDetails(
    id,
    userId,
    {
      bookedFor,
      address,
      specialInstructions,
      total,
      inspectionFee,
      tax,
      rewardDiscount,
    },
  ) {
    await pool.query(
      `UPDATE orders
       SET booked_for = ?, address = ?, special_instructions = ?,
           total = ?, inspection_fee = ?, tax = ?, reward_discount = ?
       WHERE id = ? AND user_id = ?`,
      [
        bookedFor,
        address,
        specialInstructions || null,
        total,
        inspectionFee,
        tax,
        rewardDiscount || 0,
        id,
        userId,
      ],
    );
  }

  static async replaceItems(orderId, items) {
    await pool.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items
         (order_id, service_id, service_work_price_id, service_work_title, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.serviceId,
          item.serviceWorkPriceId || null,
          item.serviceWorkTitle || null,
          item.quantity,
          item.price,
        ],
      );
    }
  }
}

export default Order;

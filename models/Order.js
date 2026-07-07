import pool from '../config/db.js';
import PaymentReceipt from './PaymentReceipt.js';
import AppControl from './AppControl.js';

class Order {
  static async create({
    id,
    userId,
    total,
    status = 'confirmed',
    bookedFor,
    paymentMethod,
    address,
    specialInstructions,
    inspectionFee,
    tax,
    rewardPointsEarned = 0,
    rewardPointsRedeemed = 0,
    rewardDiscount = 0,
  }) {
    await pool.query(
      `INSERT INTO orders
       (id, user_id, total, status, booked_for, payment_method, address,
        special_instructions, inspection_fee, tax, reward_points_earned,
        reward_points_redeemed, reward_discount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    );
    return id;
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
              created_at as createdAt
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    const receiptsByOrderId = await PaymentReceipt.findLatestByUserOrderIds(
      userId,
      orders.map(order => order.id),
    );

    // Populate items for each order
    const populatedOrders = [];
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.quantity, oi.price, oi.service_work_price_id as serviceWorkPriceId,
                oi.service_work_title as serviceWorkTitle,
                s.id as service_id, s.title, s.description, s.duration, s.category_id,
                sr.id as review_id, sr.rating as review_rating, sr.comment as review_comment
         FROM order_items oi 
         JOIN services s ON oi.service_id = s.id 
         LEFT JOIN service_reviews sr
           ON sr.order_id = oi.order_id
          AND sr.service_id = oi.service_id
          AND sr.user_id = ?
         WHERE oi.order_id = ?`,
        [userId, order.id],
      );

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

      populatedOrders.push({
        ...order,
        total: Number(order.total),
        inspectionFee: Number(order.inspectionFee),
        tax: Number(order.tax),
        rewardPointsEarned: Number(order.rewardPointsEarned || 0),
        rewardPointsRedeemed: Number(order.rewardPointsRedeemed || 0),
        rewardDiscount: Number(order.rewardDiscount || 0),
        paymentReceipt: receiptsByOrderId[order.id] || null,
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


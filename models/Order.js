import pool from '../config/db.js';

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
  }) {
    await pool.query(
      'INSERT INTO orders (id, user_id, total, status, booked_for, payment_method, address, special_instructions, inspection_fee, tax) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
      ],
    );
    return id;
  }

  static async addItems(orderId, items) {
    // items is an array of { serviceId, quantity, price }
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, service_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.serviceId, item.quantity, item.price],
      );
    }
  }

  static async findByUserId(userId) {
    const [orders] = await pool.query(
      'SELECT id, total, status, booked_for as bookedFor, payment_method as paymentMethod, address, special_instructions as specialInstructions, inspection_fee as inspectionFee, tax, created_at as createdAt FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );

    // Populate items for each order
    const populatedOrders = [];
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.quantity, oi.price, s.id as service_id, s.title, s.description, s.duration, s.category_id,
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
        items: cartItems,
      });
    }

    return populatedOrders;
  }

  static async updateStatus(id, status) {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  }

  static async findOwnedById(id, userId) {
    const [orders] = await pool.query(
      'SELECT id, status, user_id as userId FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
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
    {bookedFor, address, specialInstructions, total, inspectionFee, tax},
  ) {
    await pool.query(
      `UPDATE orders
       SET booked_for = ?, address = ?, special_instructions = ?,
           total = ?, inspection_fee = ?, tax = ?
       WHERE id = ? AND user_id = ?`,
      [
        bookedFor,
        address,
        specialInstructions || null,
        total,
        inspectionFee,
        tax,
        id,
        userId,
      ],
    );
  }

  static async replaceItems(orderId, items) {
    await pool.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, service_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.serviceId, item.quantity, item.price],
      );
    }
  }
}

export default Order;

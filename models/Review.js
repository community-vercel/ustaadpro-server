import pool from '../config/db.js';
import AppControl from './AppControl.js';

function mapReview(row) {
  return {
    id: row.id,
    serviceId: row.service_id,
    orderId: row.order_id,
    userId: row.user_id,
    rating: Number(row.rating),
    comment: row.comment,
    customerName: row.customer_name || 'Customer',
    createdAt: row.created_at,
  };
}

class Review {
  static async findByServiceId(serviceId) {
    await AppControl.ensureSchema();
    const [rows] = await pool.query(
      `SELECT sr.*, u.name as customer_name
       FROM service_reviews sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.service_id = ?
       ORDER BY sr.created_at DESC`,
      [serviceId],
    );

    return rows.map(mapReview);
  }

  static async create({serviceId, orderId, userId, rating, comment}) {
    await AppControl.ensureSchema();

    const [eligibleRows] = await pool.query(
      `SELECT o.id
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ?
         AND o.user_id = ?
         AND (oi.service_id = ? OR ? = o.id)
         AND o.status = 'completed'
       LIMIT 1`,
      [orderId, userId, serviceId, serviceId],
    );

    if (!eligibleRows.length) {
      const error = new Error(
        'You can only review services from completed bookings.',
      );
      error.statusCode = 403;
      throw error;
    }

    try {
      await pool.query(
        `INSERT INTO service_reviews (service_id, order_id, user_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
        [serviceId, orderId, userId, rating, comment],
      );
      await this.refreshServiceStats(serviceId);
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
        console.warn(`[Review] Skipped inserting review for non-existent service_id: ${serviceId}`);
      } else {
        throw error;
      }
    }
  }

  static async refreshServiceStats(serviceId) {
    const [[stats]] = await pool.query(
      `SELECT COUNT(*) as reviews, COALESCE(AVG(rating), 0) as rating
       FROM service_reviews
       WHERE service_id = ?`,
      [serviceId],
    );

    await pool.query(
      'UPDATE services SET reviews = ?, rating = ? WHERE id = ?',
      [Number(stats.reviews), Number(stats.rating).toFixed(2), serviceId],
    );
  }
}

export default Review;

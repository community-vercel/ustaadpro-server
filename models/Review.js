import pool from '../config/db.js';

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

// Postgres error codes surfaced through the mysql-compat db layer
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const stringifyId = value => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toNumericId = value => {
  const str = stringifyId(value);
  return /^\d+$/.test(str) ? Number(str) : null;
};

class Review {
  static async findByServiceId(serviceId) {
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
    const svcId = stringifyId(serviceId);
    const ordId = stringifyId(orderId);
    const numericUserId = toNumericId(userId);

    // Eligibility = the authenticated user owns a COMPLETED booking with this
    // id. Case/whitespace tolerant on the order id, type tolerant on the
    // user id (some JWTs carry it as a string).
    const [eligibleRows] = await pool.query(
      `SELECT o.id
       FROM orders o
       WHERE (o.id = ? OR LOWER(o.id) = LOWER(?))
         AND (o.user_id = ? ${numericUserId !== null ? 'OR o.user_id = ?' : ''})
         AND o.status = 'completed'
       LIMIT 1`,
      [ordId, ordId, userId, ...(numericUserId !== null ? [numericUserId] : [])],
    );

    if (!eligibleRows.length) {
      // Find out exactly WHY so the response (and server log) pinpoints it.
      const reasons = [];
      try {
        const [byOrder] = await pool.query(
          `SELECT o.id, o.user_id, o.status
           FROM orders o
           WHERE o.id = ? OR LOWER(o.id) = LOWER(?)
           LIMIT 1`,
          [ordId, ordId],
        );
        if (!byOrder.length) {
          reasons.push(`booking ${ordId || '(empty)'} not found`);
        } else {
          const order = byOrder[0];
          if (Number(order.user_id) !== Number(userId)) {
            reasons.push(
              `booking belongs to account #${order.user_id} but token says #${userId}`,
            );
          }
          if (order.status !== 'completed') {
            reasons.push(`booking status is '${order.status}'`);
          }
        }
      } catch (diagError) {
        reasons.push(`lookup failed: ${diagError.message}`);
      }

      console.warn(
        `[Review] Rejected: ${reasons.join('; ') || 'unknown reason'}`,
      );
      console.warn(
        `[Review] Payload: serviceId=${JSON.stringify(serviceId)}, orderId=${JSON.stringify(orderId)}, userId=${JSON.stringify(userId)}`,
      );

      const error = new Error(
        `You can only review services from completed bookings. (${reasons.join('; ') || 'unknown reason'})`,
      );
      error.statusCode = 403;
      throw error;
    }

    try {
      await pool.query(
        `INSERT INTO service_reviews (service_id, order_id, user_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
        [svcId, ordId, numericUserId !== null ? numericUserId : userId, rating, comment],
      );
    } catch (error) {
      const isDuplicate =
        error.code === PG_UNIQUE_VIOLATION || error.code === 'ER_DUP_ENTRY';
      const isMissingReference =
        error.code === PG_FOREIGN_KEY_VIOLATION ||
        error.code === 'ER_NO_REFERENCED_ROW_2' ||
        error.code === 'ER_NO_REFERENCED_ROW';

      if (isDuplicate) {
        const conflict = new Error(
          'You have already reviewed this service booking.',
        );
        conflict.statusCode = 409;
        throw conflict;
      }

      if (isMissingReference) {
        const match = /constraint "([^"]+)"/i.exec(error.message || '');
        const constraint = match ? match[1] : 'unknown';
        console.warn(
          `[Review] FK violation on insert: ${constraint} (serviceId=${svcId}, orderId=${ordId}, userId=${userId})`,
        );
        const ineligible = new Error(
          `You can only review services from completed bookings. (invalid reference: ${constraint})`,
        );
        ineligible.statusCode = 403;
        throw ineligible;
      }

      throw error;
    }

    await this.refreshServiceStats(svcId);
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

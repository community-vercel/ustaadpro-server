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
    const numericSvcId = toNumericId(svcId);
    const numericOrdId = toNumericId(ordId);
    const numericUserId = toNumericId(userId);

    const [eligibleRows] = await pool.query(
      `SELECT o.id
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE (o.id = ? ${numericOrdId ? 'OR o.id = ?' : ''})
         AND (o.user_id = ? ${numericUserId ? 'OR o.user_id = ?' : ''})
         AND o.status = 'completed'
       LIMIT 1`,
      [
        ordId,
        ...(numericOrdId ? [numericOrdId] : []),
        userId,
        ...(numericUserId ? [numericUserId] : []),
      ],
    );

    if (!eligibleRows.length) {
      // Precise diagnostics: figure out WHY it failed so logs show the
      // exact failing condition instead of a generic message.
      const diagnostics = [];
      try {
        const [byOrder] = await pool.query(
          `SELECT o.id, o.user_id, o.status, o.created_at
           FROM orders o WHERE o.id = ? LIMIT 1`,
          [ordId],
        );
        if (!byOrder.length) {
          diagnostics.push(`order ${ordId} not found`);
        } else {
          const order = byOrder[0];
          if (Number(order.user_id) !== Number(userId)) {
            diagnostics.push(`order belongs to user ${order.user_id}, not ${userId}`);
          }
          if (order.status !== 'completed') {
            diagnostics.push(`order status is '${order.status}'`);
          } else {
            const [items] = await pool.query(
              `SELECT service_id FROM order_items WHERE order_id = ?`,
              [ordId],
            );
            if (items.length) {
              const itemIds = items.map(i => i.service_id);
              if (!itemIds.some(id => stringifyId(id) === svcId)) {
                diagnostics.push(
                  `service ${svcId} not in order items [${itemIds.join(', ')}]`,
                );
              }
            } else {
              diagnostics.push('order has no order_items rows (treated as eligible)');
            }
          }
        }
      } catch (diagError) {
        diagnostics.push(`diagnostic query failed: ${diagError.message}`);
      }

      console.warn(
        `[Review] Ineligible review attempt: ${diagnostics.join('; ') || 'unknown reason'}`,
      );
      console.warn(
        `[Review] Received: serviceId=${JSON.stringify(serviceId)} (${typeof serviceId}), orderId=${JSON.stringify(orderId)} (${typeof orderId}), userId=${JSON.stringify(userId)} (${typeof userId})`,
      );

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
        [svcId, ordId, userId, rating, comment],
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
        // Stale reference (e.g. service deleted by a catalog re-import).
        const ineligible = new Error(
          'You can only review services from completed bookings.',
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

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
    let svcId = stringifyId(serviceId);
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

    // The FK target for service_reviews.service_id is services.id. The
    // serviceId sent by the client can be stale (catalog re-seeded, service
    // deleted) or flat-out wrong, which previously caused the insert to blow
    // up with "invalid reference: service_reviews_service_id_fkey". Resolve
    // the canonical service id(s) from the booking's order_items instead —
    // order_items.service_id is itself FK-verified against services, so any
    // id returned here is guaranteed to be insertable.
    const [bookingItems] = await pool.query(
      `SELECT DISTINCT oi.service_id
       FROM order_items oi
       WHERE oi.order_id = ? OR LOWER(oi.order_id) = LOWER(?)`,
      [ordId, ordId],
    );

    const bookedServiceIds = bookingItems.map(item => stringifyId(item.service_id));

    if (bookedServiceIds.length === 0) {
      const error = new Error(
        'This booking has no services attached, so it cannot be reviewed.',
      );
      error.statusCode = 403;
      throw error;
    }

    // Treat common client-side garbage ("undefined", "null", "[object Object]"
    // stringified by the app) as "not provided" so it falls through to
    // server-side resolution below.
    if (['undefined', 'null', '[object Object]'].includes(svcId.toLowerCase())) {
      svcId = '';
    }

    if (svcId) {
      const exactMatch = bookedServiceIds.find(booked => booked === svcId);
      if (exactMatch) {
        svcId = exactMatch;
      } else {
        // Case-only difference (e.g. "AC-Gas-Refill" vs "ac-gas-refill") is
        // still the same service — accept it.
        const caseInsensitiveMatch = bookedServiceIds.find(
          booked => booked.toLowerCase() === svcId.toLowerCase(),
        );

        if (caseInsensitiveMatch) {
          svcId = caseInsensitiveMatch;
        } else {
          // The app sent a service id that is not part of this booking
          // (stale catalog id, wrong field from the review screen, etc.).
          // Do NOT block the customer: attach the review to the service they
          // actually booked and log the discrepancy for debugging.
          console.warn(
            `[Review] serviceId mismatch: client sent ${JSON.stringify(svcId)} but booking ${ordId} contains ${JSON.stringify(bookedServiceIds)}; attaching review to the booked service instead`,
          );
          svcId = bookedServiceIds[0];
        }
      }
    } else {
      // Client did not send a usable serviceId: review the first booked
      // service (bookings usually contain a single service).
      svcId = bookedServiceIds[0];
    }

    // Final safety net: if the booked service no longer exists in `services`
    // (catalog re-seeded / service deleted — order_items keeps historical ids
    // only when the FK allows it), fail with a readable message instead of a
    // raw FK violation. When the service does exist, rewrite service_id from
    // its canonical row so the insert can never hit the FK.
    const [serviceExists] = await pool.query(
      'SELECT id FROM services WHERE id = ? OR LOWER(id) = LOWER(?) LIMIT 1',
      [svcId, svcId],
    );

    if (!serviceExists.length) {
      console.warn(
        `[Review] booked service ${JSON.stringify(svcId)} no longer exists in services table (orderId=${ordId})`,
      );
      const error = new Error(
        'This service is no longer available for reviews.',
      );
      error.statusCode = 403;
      throw error;
    }

    svcId = serviceExists[0].id;

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

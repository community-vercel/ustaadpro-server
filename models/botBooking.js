import db from '../config/db.js';

class Booking {
    // Get all bot_bookings with optional status filter
    static async findAll(status = null) {
        let query = 'SELECT id, user_id, main_category, service_type, sub_service, date, time, customer_phone, address, address_type, has_image, status, created_at FROM bot_bookings';
        const params = [];

        if (status && status !== 'all') {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await db.query(query, params);
        return rows;
    }

    // Create new booking (bot.js se call hota hai)
    static async create(userId, orderDetails) {
        // bot.js camelCase bhejta hai, hum snake_case mein convert karte hain
        const {
            mainCategory,
            serviceType,
            subService,
            date,
            time,
            customerPhone,
            address,
            addressType,
            hasImage,
            imageData,
            imageMime
        } = orderDetails;

        const query = `
            INSERT INTO bot_bookings (user_id, main_category, service_type, sub_service, 
                                 date, time, customer_phone, address, address_type, has_image, image_data, image_mime) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING *
        `;
        const [rows] = await db.query(query, [
            userId,
            mainCategory || '',
            serviceType || '',
            subService || '',
            date || '',
            time || '',
            customerPhone || '',
            address || '',
            addressType || 'text',
            hasImage || 'No Picture',
            imageData || null,
            imageMime || null
        ]);

        console.log("✅ Booking saved - ID:", rows[0].id);
        return rows[0];
    }

    // Update booking status
    static async updateStatus(id, status) {
        const query = 'UPDATE bot_bookings SET status = $1 WHERE id = $2 RETURNING *';
        const [rows] = await db.query(query, [status, id]);
        return rows[0];
    }

    // Delete booking
    static async delete(id) {
        const query = 'DELETE FROM bot_bookings WHERE id = $1 RETURNING *';
        const [rows] = await db.query(query, [id]);
        return rows[0];
    }

    // Get statistics
    static async getStats() {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM bot_bookings',
        pending: `SELECT COUNT(*) as count FROM bot_bookings WHERE status = 'pending'`,
        completed: `SELECT COUNT(*) as count FROM bot_bookings WHERE status = 'completed'`,
        today: `SELECT COUNT(*) as count FROM bot_bookings WHERE created_at >= CURRENT_DATE`
    };

    const [totalRows] = await db.query(queries.total);
    const [pendingRows] = await db.query(queries.pending);
    const [completedRows] = await db.query(queries.completed);
    const [todayRows] = await db.query(queries.today);

    return {
        totalBookings: parseInt(totalRows[0].count),
        pendingBookings: parseInt(pendingRows[0].count),
        completedBookings: parseInt(completedRows[0].count),
        todayBookings: parseInt(todayRows[0].count)
    };
}
}

export default Booking;

import db from '../config/db.js';

class Session {
    // Get session by user ID
    static async findByUserId(userId) {
        const query = 'SELECT * FROM bot_sessions WHERE user_id = $1';
        const [rows] = await db.query(query, [userId]);
        return rows[0];
    }

    // Create or update session (simplified for bot.js)
    static async upsert(userId, sessionData) {
        const { state, orderDetails, currentServiceKey, currentServiceType, changeDateTemp } = sessionData;

        const query = `
            INSERT INTO bot_sessions (user_id, step, order_details, current_service_key, 
                                 current_service_type, change_date_temp, updated_at) 
            VALUES ($1, $2, $3::jsonb, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                step = $2,
                order_details = $3::jsonb,
                current_service_key = $4,
                current_service_type = $5,
                change_date_temp = $6,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const [rows] = await db.query(query, [
            userId,
            state || 'SELECT_CATEGORY',
            JSON.stringify(orderDetails || {}),
            currentServiceKey || null,
            currentServiceType || null,
            changeDateTemp || null
        ]);
        return rows[0];
    }

    // Delete session
    static async delete(userId) {
        const query = 'DELETE FROM bot_sessions WHERE user_id = $1 RETURNING *';
        const [rows] = await db.query(query, [userId]);
        return rows[0];
    }

    // Get all active bot_sessions
    static async findAll() {
        const query = 'SELECT * FROM bot_sessions ORDER BY updated_at DESC';
        const [rows] = await db.query(query);
        return rows;
    }

    // Count active bot_sessions
    static async countActive() {
        const query = 'SELECT COUNT(*) as count FROM bot_sessions';
        const [rows] = await db.query(query);
        return parseInt(rows[0].count);
    }
}

export default Session;

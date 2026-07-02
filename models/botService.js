import db from '../config/db.js';

class Service {
    // Get all bot_services
    static async findAll() {
        const query = 'SELECT * FROM bot_services ORDER BY category, name';
        const [rows] = await db.query(query);
        return rows;
    }

    // Get single service by ID
    static async findById(id) {
        const query = 'SELECT * FROM bot_services WHERE id = $1';
        const [rows] = await db.query(query, [id]);
        return rows[0];
    }

    // Create new service
    static async create({ category, name, msg, options = [] }) {
        const query = `
            INSERT INTO bot_services (category, name, msg, options) 
            VALUES ($1, $2, $3, $4::jsonb) 
            RETURNING *
        `;
        const [rows] = await db.query(query, [category, name, msg, JSON.stringify(options)]);
        return rows[0];
    }

    // Update service
    static async update(id, { category, name, msg, options, active }) {
        const query = `
            UPDATE bot_services 
            SET category = $1, name = $2, msg = $3, 
                options = $4::jsonb, active = $5, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 
            RETURNING *
        `;
        const [rows] = await db.query(query, [
            category, name, msg, JSON.stringify(options), active, id
        ]);
        return rows[0];
    }

    // Delete service
    static async delete(id) {
        const query = 'DELETE FROM bot_services WHERE id = $1 RETURNING *';
        const [rows] = await db.query(query, [id]);
        return rows[0];
    }

    // Count active bot_services
    static async countActive() {
        const query = 'SELECT COUNT(*) as count FROM bot_services WHERE active = true';
        const [rows] = await db.query(query);
        return parseInt(rows[0].count);
    }

    // Get distinct categories
    static async getCategories() {
        const query = 'SELECT DISTINCT category FROM bot_services WHERE active = true ORDER BY category';
        const [rows] = await db.query(query);
        return rows.map(r => r.category);
    }

    // Find bot_services by category
    static async findByCategory(category) {
        const query = 'SELECT * FROM bot_services WHERE active = true AND category = $1 ORDER BY name';
        const [rows] = await db.query(query, [category]);
        return rows;
    }
}

export default Service;

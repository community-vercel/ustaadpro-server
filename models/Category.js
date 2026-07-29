import pool from '../config/db.js';

class Category {
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM categories WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY sort_order ASC, title ASC');
    return rows;
  }
}

export default Category;

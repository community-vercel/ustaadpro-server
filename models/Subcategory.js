import pool from '../config/db.js';

class Subcategory {
  static async findByCategoryId(categoryId) {
    const [rows] = await pool.query(
      'SELECT id, category_id as categoryId, title, description FROM subcategories WHERE category_id = ?',
      [categoryId]
    );
    return rows;
  }
}

export default Subcategory;

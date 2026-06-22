import pool from '../config/db.js';

class Category {
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM categories');
    return rows;
  }
}

export default Category;

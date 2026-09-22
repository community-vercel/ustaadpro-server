import pool from '../config/db.js';

function mapSubcategory(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description || '',
    imageUrl: row.image_url || '',
    webImageUrl: row.web_image_url || '',
    mobileIconUrl: row.mobile_icon_url || '',
    pricingMode: row.pricing_mode === 'per_sqft' ? 'per_sqft' : 'fixed',
  };
}

class Subcategory {
  static async findByCategoryId(categoryId) {
    try {
      const [rows] = await pool.query(
        `SELECT id, category_id, title, description,
                image_url, web_image_url, mobile_icon_url, pricing_mode
         FROM subcategories WHERE category_id = ?`,
        [categoryId],
      );
      return rows.map(mapSubcategory);
    } catch (error) {
      // Older database without the pricing_mode column yet.
      if (String(error.message || '').includes('pricing_mode')) {
        const [rows] = await pool.query(
          `SELECT id, category_id, title, description,
                  image_url, web_image_url, mobile_icon_url
           FROM subcategories WHERE category_id = ?`,
          [categoryId],
        );
        return rows.map(row => ({...mapSubcategory(row), pricingMode: 'fixed'}));
      }
      throw error;
    }
  }
}

export default Subcategory;

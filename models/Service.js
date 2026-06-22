import pool from '../config/db.js';
import AppControl from './AppControl.js';

class Service {
  static async getAll({categoryId = null, subcategoryId = null} = {}) {
    await AppControl.ensureSchema();
    let query = 'SELECT * FROM services';
    const params = [];
    const conditions = [];

    if (categoryId) {
      conditions.push('category_id = ?');
      params.push(categoryId);
    }

    if (subcategoryId) {
      conditions.push('subcategory_id = ?');
      params.push(subcategoryId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY updated_at DESC, title ASC';

    const [rows] = await pool.query(query, params);
    return rows.map(row => ({
      ...row,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      originalPrice: row.original_price,
      serviceType: row.service_type,
      imageUrl: row.image_url || '',
      detailDescription: row.detail_description || '',
      details:
        typeof row.details === 'string'
          ? JSON.parse(row.details || '[]')
          : row.details || [],
      includes:
        typeof row.includes === 'string'
          ? JSON.parse(row.includes)
          : row.includes,
      excludes:
        typeof row.excludes === 'string'
          ? JSON.parse(row.excludes)
          : row.excludes,
    }));
  }

  static async findById(id) {
    await AppControl.ensureSchema();
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [
      id,
    ]);
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      ...row,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      originalPrice: row.original_price,
      serviceType: row.service_type,
      imageUrl: row.image_url || '',
      detailDescription: row.detail_description || '',
      details:
        typeof row.details === 'string'
          ? JSON.parse(row.details || '[]')
          : row.details || [],
      includes:
        typeof row.includes === 'string'
          ? JSON.parse(row.includes)
          : row.includes,
      excludes:
        typeof row.excludes === 'string'
          ? JSON.parse(row.excludes)
          : row.excludes,
    };
  }

  static async create(payload) {
    await AppControl.ensureSchema();
    const id =
      payload.id ||
      payload.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    await pool.query(
      `INSERT INTO services
       (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, service_type, image_url, detail_description, details, includes, excludes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.categoryId || payload.category_id || 'home',
        payload.subcategoryId || payload.subcategory_id || null,
        payload.title,
        payload.description,
        Number(payload.price || 0),
        Number(
          payload.originalPrice || payload.original_price || payload.price || 0,
        ),
        payload.duration || '60 min',
        Number(payload.rating || 0),
        Number(payload.reviews || 0),
        payload.badge || null,
        payload.serviceType || payload.service_type || 'Standard Visit',
        payload.imageUrl || payload.image_url || '',
        payload.detailDescription || payload.detail_description || '',
        JSON.stringify(payload.details || []),
        JSON.stringify(payload.includes || []),
        JSON.stringify(payload.excludes || []),
      ],
    );

    return id;
  }

  static async update(id, payload) {
    await AppControl.ensureSchema();
    await pool.query(
      `UPDATE services
       SET category_id = ?, subcategory_id = ?, title = ?, description = ?,
           price = ?, original_price = ?, duration = ?, rating = ?, reviews = ?,
           badge = ?, service_type = ?, image_url = ?, detail_description = ?, details = ?, includes = ?, excludes = ?
       WHERE id = ?`,
      [
        payload.categoryId || payload.category_id || 'home',
        payload.subcategoryId || payload.subcategory_id || null,
        payload.title,
        payload.description,
        Number(payload.price || 0),
        Number(
          payload.originalPrice || payload.original_price || payload.price || 0,
        ),
        payload.duration || '60 min',
        Number(payload.rating || 0),
        Number(payload.reviews || 0),
        payload.badge || null,
        payload.serviceType || payload.service_type || 'Standard Visit',
        payload.imageUrl || payload.image_url || '',
        payload.detailDescription || payload.detail_description || '',
        JSON.stringify(payload.details || []),
        JSON.stringify(payload.includes || []),
        JSON.stringify(payload.excludes || []),
        id,
      ],
    );
  }
}

export default Service;

import pool from '../config/db.js';
import AppControl from './AppControl.js';

function parseJsonList(value, fallback = []) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '[]');
    } catch {
      return fallback;
    }
  }

  return value || fallback;
}

function normalizeWorkPrices(workPrices = []) {
  if (!Array.isArray(workPrices)) return [];

  return workPrices
    .map((item, index) => ({
      id: item.id ? Number(item.id) : null,
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      price: Number(item.price || 0),
      imageUrl: item.imageUrl || item.image_url || '',
      sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
    }))
    .filter(item => item.title && item.price > 0);
}

function mapWorkPrice(row) {
  return {
    id: Number(row.id),
    serviceId: row.service_id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price || 0),
    imageUrl: row.image_url || '',
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapService(row, workPrices = []) {
  return {
    ...row,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    originalPrice: Number(row.original_price || 0),
    serviceType: row.service_type,
    imageUrl: row.image_url || '',
    detailDescription: row.detail_description || '',
    details: parseJsonList(row.details),
    includes: parseJsonList(row.includes),
    excludes: parseJsonList(row.excludes),
    price: Number(row.price || 0),
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
    workPrices,
  };
}

class Service {
  static async getWorkPricesByServiceIds(serviceIds) {
    if (!serviceIds.length) return new Map();

    const placeholders = serviceIds.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT id, service_id, title, description, price, image_url, sort_order
       FROM service_work_prices
       WHERE service_id IN (${placeholders})
       ORDER BY service_id ASC, sort_order ASC, price ASC, title ASC`,
      serviceIds,
    );

    const pricesByService = new Map();
    rows.forEach(row => {
      const list = pricesByService.get(row.service_id) || [];
      list.push(mapWorkPrice(row));
      pricesByService.set(row.service_id, list);
    });

    return pricesByService;
  }

  static async replaceWorkPrices(serviceId, workPrices = []) {
    const normalized = normalizeWorkPrices(workPrices);

    await pool.query('DELETE FROM service_work_prices WHERE service_id = ?', [
      serviceId,
    ]);

    for (const [index, item] of normalized.entries()) {
      await pool.query(
        `INSERT INTO service_work_prices
         (service_id, title, description, price, image_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          serviceId,
          item.title,
          item.description || null,
          item.price,
          item.imageUrl || null,
          Number.isFinite(item.sortOrder) ? item.sortOrder : index,
        ],
      );
    }

    return normalized;
  }

  static displayPriceFromPayload(payload) {
    const workPrices = normalizeWorkPrices(payload.workPrices || payload.work_prices);
    if (workPrices.length) {
      return Math.min(...workPrices.map(item => Number(item.price || 0)));
    }
    return Number(payload.price || 0);
  }

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
    const pricesByService = await this.getWorkPricesByServiceIds(
      rows.map(row => row.id),
    );

    return rows.map(row => mapService(row, pricesByService.get(row.id) || []));
  }

  static async findById(id) {
    await AppControl.ensureSchema();
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [
      id,
    ]);
    if (!rows[0]) return null;
    const pricesByService = await this.getWorkPricesByServiceIds([id]);
    return mapService(rows[0], pricesByService.get(id) || []);
  }

  static async create(payload) {
    await AppControl.ensureSchema();
    const id =
      payload.id ||
      payload.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const displayPrice = this.displayPriceFromPayload(payload);

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
        displayPrice,
        Number(
          payload.originalPrice || payload.original_price || displayPrice || 0,
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

    await this.replaceWorkPrices(id, payload.workPrices || payload.work_prices || []);

    return id;
  }

  static async update(id, payload) {
    await AppControl.ensureSchema();
    const displayPrice = this.displayPriceFromPayload(payload);

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
        displayPrice,
        Number(
          payload.originalPrice || payload.original_price || displayPrice || 0,
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

    await this.replaceWorkPrices(id, payload.workPrices || payload.work_prices || []);
  }
}

export default Service;

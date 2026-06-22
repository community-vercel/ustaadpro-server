import pool from '../config/db.js';

async function ensureShopTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id VARCHAR(80) PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'General',
      description TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      original_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      image_url TEXT NULL,
      stock INT NOT NULL DEFAULT 0,
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id VARCHAR(40) PRIMARY KEY,
      user_id INT NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'placed',
      payment_method VARCHAR(80) NULL,
      address VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool
    .query(
        'ALTER TABLE shop_orders ADD COLUMN shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0',
    )
    .catch(error => {
      if (error?.code !== 'ER_DUP_FIELDNAME' && error?.code !== '42701') {
        throw error;
      }
    });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_order_items (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(40) NOT NULL,
      product_id VARCHAR(80) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES shop_products(id)
    )
  `);
}

function normalizeProduct(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    price: Number(row.price),
    originalPrice: Number(row.originalPrice ?? row.original_price ?? 0),
    imageUrl: row.imageUrl ?? row.image_url ?? '',
    stock: Number(row.stock ?? 0),
    isActive: Boolean(row.isActive ?? row.is_active),
    createdAt: row.createdAt ?? row.created_at,
  };
}

class Shop {
  static async ensureTables() {
    await ensureShopTables();
  }

  static async getProducts({activeOnly = true} = {}) {
    await ensureShopTables();
    const [rows] = await pool.query(
      `SELECT id, title, category, description, price,
              original_price as originalPrice, image_url as imageUrl,
              stock, is_active as isActive, created_at as createdAt
       FROM shop_products
       ${activeOnly ? 'WHERE is_active = 1' : ''}
       ORDER BY created_at DESC`,
    );
    return rows.map(normalizeProduct);
  }

  static async findProductById(id) {
    await ensureShopTables();
    const [rows] = await pool.query(
      `SELECT id, title, category, description, price,
              original_price as originalPrice, image_url as imageUrl,
              stock, is_active as isActive, created_at as createdAt
       FROM shop_products WHERE id = ?`,
      [id],
    );
    return rows[0] ? normalizeProduct(rows[0]) : null;
  }

  static async saveProduct(product) {
    await ensureShopTables();
    const id =
      product.id ||
      String(product.title || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      `product-${Date.now()}`;

    await pool.query(
      `INSERT INTO shop_products
       (id, title, category, description, price, original_price, image_url, stock, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         original_price = EXCLUDED.original_price,
         image_url = EXCLUDED.image_url,
         stock = EXCLUDED.stock,
         is_active = EXCLUDED.is_active`,
      [
        id,
        product.title,
        product.category || 'General',
        product.description || '',
        Number(product.price || 0),
        Number(product.originalPrice || product.original_price || 0),
        product.imageUrl || product.image_url || '',
        Number(product.stock || 0),
        product.isActive === false ? 0 : 1,
      ],
    );
    return id;
  }

  static async createOrder({
    id,
    userId,
    total,
    shippingCost = 0,
    status,
    paymentMethod,
    address,
    items,
  }) {
    await ensureShopTables();
    await pool.query(
      'INSERT INTO shop_orders (id, user_id, total, shipping_cost, status, payment_method, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, total, shippingCost, status, paymentMethod, address],
    );

    for (const item of items) {
      await pool.query(
        'INSERT INTO shop_order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [id, item.productId, item.quantity, item.price],
      );
      await pool.query(
        'UPDATE shop_products SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
        [item.quantity, item.productId],
      );
    }
  }

  static async getOrders({userId} = {}) {
    await ensureShopTables();
    const params = [];
    const where = userId ? 'WHERE so.user_id = ?' : '';
    if (userId) params.push(userId);

    const [orders] = await pool.query(
      `SELECT so.id, so.total, so.shipping_cost as shippingCost,
              so.status, so.payment_method as paymentMethod,
              so.address, so.created_at as createdAt,
              u.name as customerName, u.phone as customerPhone, u.email as customerEmail
       FROM shop_orders so
       JOIN users u ON u.id = so.user_id
       ${where}
       ORDER BY so.created_at DESC`,
      params,
    );

    const populated = [];
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT soi.quantity, soi.price, sp.id, sp.title, sp.category,
                sp.description, sp.image_url as imageUrl
         FROM shop_order_items soi
         JOIN shop_products sp ON sp.id = soi.product_id
         WHERE soi.order_id = ?`,
        [order.id],
      );
      populated.push({
        ...order,
        total: Number(order.total),
        shippingCost: Number(order.shippingCost || 0),
        items: items.map(item => ({
          quantity: Number(item.quantity),
          price: Number(item.price),
          product: {
            id: item.id,
            title: item.title,
            category: item.category,
            description: item.description,
            imageUrl: item.imageUrl || '',
          },
        })),
      });
    }
    return populated;
  }

  static async updateOrderStatus(id, status) {
    await ensureShopTables();
    await pool.query('UPDATE shop_orders SET status = ? WHERE id = ?', [status, id]);
  }

  static async findOrderOwner(id) {
    await ensureShopTables();
    const [rows] = await pool.query(
      `SELECT so.user_id as userId, u.fcm_token as fcmToken
       FROM shop_orders so
       JOIN users u ON u.id = so.user_id
       WHERE so.id = ?`,
      [id],
    );
    return rows[0] || null;
  }
}

export default Shop;

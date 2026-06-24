import pool from '../config/db.js';

const defaultSlides = [
  {
    id: 'flash-cleaning',
    badge: 'Flash Sale',
    title: 'Flat 15% Off\nDeep Cleaning',
    subtitle: 'Quality service guaranteed.\nStarting from PKR 2,500.',
    buttonLabel: 'Book Now',
    categoryId: 'cleaning',
    categoryTitle: 'Cleaning',
    visual: '15%',
    imageUrl: '',
    primaryColor: '#131b2e',
    secondaryColor: '#213145',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'quick-ac',
    badge: 'Quick Help',
    title: 'AC Repair\nAt Your Doorstep',
    subtitle: 'Book verified cooling experts.\nSame-day slots available.',
    buttonLabel: 'Fix AC',
    categoryId: 'home',
    categoryTitle: 'Home',
    visual: 'AC',
    imageUrl: '',
    primaryColor: '#0f766e',
    secondaryColor: '#134e4a',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'care-plan',
    badge: 'Care Plan',
    title: 'Save More With\nMaintenance Plans',
    subtitle:
      'Routine checks, priority service,\nand predictable monthly care.',
    buttonLabel: 'View Plans',
    categoryId: 'subscriptions',
    categoryTitle: 'Subscriptions',
    visual: 'PRO',
    imageUrl: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#312e81',
    sortOrder: 3,
    isActive: true,
  },
];

const defaultSettings = {
  inspectionFee: 500,
  serviceTaxPercent: 12,
  currency: 'PKR',
  supportPhone: '+923001234567',
  shippingCost: 200,
};

const defaultCategories = [
  {
    id: 'home',
    title: 'Home Services',
    subtitle: 'AC, plumbing, electrical',
    icon: 'tools',
    tint: '#0b1c30',
  },
  {
    id: 'cleaning',
    title: 'Cleaning',
    subtitle: 'Deep clean and sofa care',
    icon: 'sparkle',
    tint: '#0891B2',
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    subtitle: 'Monthly care bundles',
    icon: 'calendar',
    tint: '#7C3AED',
  },
];

function mapSlide(row) {
  return {
    id: row.id,
    badge: row.badge,
    title: row.title,
    subtitle: row.subtitle,
    buttonLabel: row.button_label,
    categoryId: row.category_id,
    categoryTitle: row.category_title,
    visual: row.visual,
    imageUrl: row.image_url || '',
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
  };
}

class AppControl {
  static async ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        subtitle VARCHAR(255) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        tint VARCHAR(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS home_slides (
        id VARCHAR(80) PRIMARY KEY,
        badge VARCHAR(80) NOT NULL,
        title VARCHAR(180) NOT NULL,
        subtitle TEXT NOT NULL,
        button_label VARCHAR(80) NOT NULL,
        category_id VARCHAR(50) NOT NULL,
        category_title VARCHAR(100) NOT NULL,
        visual VARCHAR(40) NOT NULL,
        image_url LONGTEXT NULL,
        primary_color VARCHAR(20) NOT NULL,
        secondary_color VARCHAR(20) NOT NULL,
        sort_order INT NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(80) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL,
        order_id VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_service_order_user_review (service_id, order_id, user_id),
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    for (const category of defaultCategories) {
      await pool.query(
        `INSERT INTO categories (id, title, subtitle, icon, tint)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          icon = EXCLUDED.icon,
          tint = EXCLUDED.tint`,
        [
          category.id,
          category.title,
          category.subtitle,
          category.icon,
          category.tint,
        ],
      );
    }

    const serviceColumns = [
      ['service_type', "VARCHAR(80) NOT NULL DEFAULT 'Standard Visit'"],
      ['image_url', 'LONGTEXT NULL'],
      ['detail_description', 'TEXT NULL'],
      ['details', 'JSON NULL'],
      ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
      [
        'updated_at',
        'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
      ],
    ];

    for (const [column, definition] of serviceColumns) {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'services'
           AND COLUMN_NAME = ?`,
        [column],
      );

      if (!columns.length) {
        await pool.query(
          `ALTER TABLE services ADD COLUMN ${column} ${definition}`,
        );
      }
    }

    await pool.query(
      'ALTER TABLE services MODIFY COLUMN image_url LONGTEXT NULL',
    );
    await pool.query(
      'ALTER TABLE home_slides MODIFY COLUMN image_url LONGTEXT NULL',
    );

    const orderColumns = [['cancel_reason', 'TEXT NULL']];

    for (const [column, definition] of orderColumns) {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'orders'
           AND COLUMN_NAME = ?`,
        [column],
      );

      if (!columns.length) {
        await pool.query(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
      }
    }

    const [[slideCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM home_slides',
    );

    if (!Number(slideCount.count)) {
      for (const slide of defaultSlides) {
        await this.upsertSlide(slide);
      }
    }

    const defaultEntries = [
      ['inspection_fee', defaultSettings.inspectionFee],
      ['service_tax_percent', defaultSettings.serviceTaxPercent],
      ['currency', defaultSettings.currency],
      ['support_phone', defaultSettings.supportPhone],
      ['shipping_cost', defaultSettings.shippingCost],
    ];

    for (const [key, value] of defaultEntries) {
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON CONFLICT (setting_key) DO NOTHING`,
        [key, String(value)],
      );
    }
  }

  static async getSlides({activeOnly = true} = {}) {
    await this.ensureSchema();
    const [rows] = await pool.query(
      `SELECT * FROM home_slides
       ${activeOnly ? 'WHERE is_active = 1' : ''}
       ORDER BY sort_order ASC, updated_at DESC`,
    );
    return rows.map(mapSlide);
  }

  static async upsertSlide(payload) {
    const id =
      payload.id ||
      payload.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    await pool.query(
      `INSERT INTO home_slides
       (id, badge, title, subtitle, button_label, category_id, category_title,
        visual, image_url, primary_color, secondary_color, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        badge = EXCLUDED.badge,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        button_label = EXCLUDED.button_label,
        category_id = EXCLUDED.category_id,
        category_title = EXCLUDED.category_title,
        visual = EXCLUDED.visual,
        image_url = EXCLUDED.image_url,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active`,
      [
        id,
        payload.badge || 'Featured',
        payload.title || 'Featured Service',
        payload.subtitle || 'Book trusted UstaadPro services.',
        payload.buttonLabel || payload.button_label || 'Book Now',
        payload.categoryId || payload.category_id || 'home',
        payload.categoryTitle || payload.category_title || 'Home Services',
        payload.visual || 'UP',
        payload.imageUrl || payload.image_url || '',
        payload.primaryColor || payload.primary_color || '#131b2e',
        payload.secondaryColor || payload.secondary_color || '#213145',
        Number(payload.sortOrder || payload.sort_order || 1),
        payload.isActive === false || payload.is_active === false ? 0 : 1,
      ],
    );

    return id;
  }

  static async getSettings() {
    await this.ensureSchema();
    const [rows] = await pool.query('SELECT * FROM app_settings');
    const settings = {...defaultSettings};

    for (const row of rows) {
      if (row.setting_key === 'inspection_fee') {
        settings.inspectionFee = Number(row.setting_value);
      }
      if (row.setting_key === 'service_tax_percent') {
        settings.serviceTaxPercent = Number(row.setting_value);
      }
      if (row.setting_key === 'currency') {
        settings.currency = row.setting_value;
      }
      if (row.setting_key === 'support_phone') {
        settings.supportPhone = row.setting_value;
      }
      if (row.setting_key === 'shipping_cost') {
        settings.shippingCost = Number(row.setting_value);
      }
    }

    return settings;
  }

  static async updateSettings(payload) {
    const settings = {
      inspection_fee: Number(
        payload.inspectionFee ?? defaultSettings.inspectionFee,
      ),
      service_tax_percent: Number(
        payload.serviceTaxPercent ?? defaultSettings.serviceTaxPercent,
      ),
      currency: payload.currency || defaultSettings.currency,
      support_phone: payload.supportPhone || defaultSettings.supportPhone,
      shipping_cost: Number(payload.shippingCost ?? defaultSettings.shippingCost),
    };

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [key, String(value)],
      );
    }

    return this.getSettings();
  }
}

export default AppControl;

import pool from '../config/db.js';

const defaultSlides = [
  {
    id: 'flash-cleaning',
    badge: 'Flash Sale',
    title: 'Flat 15% Off\nDeep Cleaning',
    subtitle: 'Quality service guaranteed.\nStarting from PKR 2,500.',
    buttonLabel: 'Book Now',
    categoryId: 'home-cleaning',
    categoryTitle: 'Home Cleaning',
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
    categoryId: 'ac-services',
    categoryTitle: 'AC Services',
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
  minimumBookingLeadHours: 4,
  currency: 'PKR',
  supportPhone: '+923001234567',
  shippingCost: 200,
  rewardEnabled: true,
  rewardPointValue: 25,
  rewardMinimumRedeem: 100,
  serviceRewardPointsOnCompletion: 1,
  serviceRewardMaxDiscountPercent: 10,
  shopRewardEarnPercent: 0.5,
  shopRewardMaxDiscountPercent: 5,
};

const defaultCategories = [
  {
    id: 'ac-services',
    title: 'AC Services',
    subtitle: 'Maintenance, installation, gas refill and dismounting',
    icon: 'air-conditioner',
    tint: '#4F46E5',
  },
  {
    id: 'electrician',
    title: 'Electrician',
    subtitle: 'Wiring, fans, lights, sockets and breaker repairs',
    icon: 'lightning-bolt',
    tint: '#F59E0B',
  },
  {
    id: 'plumbers',
    title: 'Plumbers',
    subtitle: 'Leakage, taps, geyser and pipe repair work',
    icon: 'wrench',
    tint: '#0891B2',
  },
  {
    id: 'home-cleaning',
    title: 'Home Cleaning',
    subtitle: 'Deep cleaning, kitchen, bathroom and water tank care',
    icon: 'sparkles',
    tint: '#006C49',
  },
  {
    id: 'dry-cleaning',
    title: 'Dry Cleaning',
    subtitle: 'Sofa, carpet, rug and fabric shampoo cleaning',
    icon: 'sparkle',
    tint: '#213145',
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    subtitle: 'Monthly home and office maintenance plans',
    icon: 'calendar',
    tint: '#213145',
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
    redirectType: row.redirect_type || 'category',
    visual: row.visual,
    imageUrl: row.image_url || '',
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
  };
}

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = current_schema()
       AND table_name = ?`,
    [tableName],
  );

  return rows.length > 0;
}

async function ensureTable(tableName, createSql) {
  if (!(await tableExists(tableName))) {
    await pool.query(createSql);
  }
}

class AppControl {
  // Schema setup is needed after a deployment/restart, but normal API calls
  // must not repeatedly issue CREATE/ALTER statements. Concurrent calls share
  // the same initialization promise until the schema is ready.
  static _schemaReady = false;
  static _schemaInitialization = null;

  static async ensureSchema() {
    if (this._schemaReady) return;
    if (this._schemaInitialization) return this._schemaInitialization;

    this._schemaInitialization = this.ensureSchemaInternal()
      .then(() => {
        this._schemaReady = true;
      })
      .finally(() => {
        this._schemaInitialization = null;
      });

    return this._schemaInitialization;
  }

  static async ensureSchemaInternal() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        subtitle VARCHAR(255) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        tint VARCHAR(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // PostgreSQL-safe and idempotent: runs at backend startup on every deploy.
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT');
    await pool.query('ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS image_url TEXT');
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS web_image_url TEXT');
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS mobile_icon_url TEXT');
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
    await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 999');
    await pool.query('ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS web_image_url TEXT');
    await pool.query('ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS mobile_icon_url TEXT');

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

    await pool.query(
      `ALTER TABLE home_slides ADD COLUMN IF NOT EXISTS redirect_type VARCHAR(40) NOT NULL DEFAULT 'category'`,
    );

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

    // Categories are managed by the admin catalog. Do not recreate defaults after a catalog cleanup.

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
      `CREATE TABLE IF NOT EXISTS service_work_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL,
        title VARCHAR(180) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        image_url LONGTEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )`,
    );

    const serviceWorkPriceColumns = [['image_url', 'LONGTEXT NULL']];

    for (const [column, definition] of serviceWorkPriceColumns) {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'service_work_prices'
           AND COLUMN_NAME = ?`,
        [column],
      );

      if (!columns.length) {
        await pool.query(
          `ALTER TABLE service_work_prices ADD COLUMN ${column} ${definition}`,
        );
      }
    }
    await pool.query(
      'ALTER TABLE home_slides MODIFY COLUMN image_url LONGTEXT NULL',
    );

    await pool.query(
      `CREATE TABLE IF NOT EXISTS payment_receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        receipt_url LONGTEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        account_number VARCHAR(40) NOT NULL,
        account_title VARCHAR(120) NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'submitted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    );

    // Existing deployments may have created payment_receipts before staged
    // payments existed. This is idempotent and runs on every API startup.
    await pool.query(
      "ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS payment_stage VARCHAR(30) NOT NULL DEFAULT 'full'",
    );
    await ensureTable(
      'order_items',
      `CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        service_id VARCHAR(50) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      )`,
    );

    await pool.query(
      `CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_id VARCHAR(50) NOT NULL,
        type VARCHAR(40) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY wallet_order_type_unique (order_id, type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )`,
    );
    const orderItemColumns = [
      ['service_work_price_id', 'INT NULL'],
      ['service_work_title', 'VARCHAR(180) NULL'],
    ];

    for (const [column, definition] of orderItemColumns) {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'order_items'
           AND COLUMN_NAME = ?`,
        [column],
      );

      if (!columns.length) {
        await pool.query(
          `ALTER TABLE order_items ADD COLUMN ${column} ${definition}`,
        );
      }
    }
    const userColumns = [['reward_points', 'INT NOT NULL DEFAULT 0']];

    for (const [column, definition] of userColumns) {
      const [columns] = await pool.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = ?`,
        [column],
      );

      if (!columns.length) {
        await pool.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
      }
    }

    const orderColumns = [
      ['cancel_reason', 'TEXT NULL'],
      ['reward_points_earned', 'INT NOT NULL DEFAULT 0'],
      ['reward_points_redeemed', 'INT NOT NULL DEFAULT 0'],
      ['reward_discount', 'NUMERIC(10, 2) NOT NULL DEFAULT 0.00'],
    ];

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
      ['minimum_booking_lead_hours', defaultSettings.minimumBookingLeadHours],
      ['currency', defaultSettings.currency],
      ['support_phone', defaultSettings.supportPhone],
      ['shipping_cost', defaultSettings.shippingCost],
      ['reward_enabled', defaultSettings.rewardEnabled ? '1' : '0'],
      ['reward_point_value', defaultSettings.rewardPointValue],
      ['reward_minimum_redeem', defaultSettings.rewardMinimumRedeem],
      [
        'service_reward_points_on_completion',
        defaultSettings.serviceRewardPointsOnCompletion,
      ],
      [
        'service_reward_max_discount_percent',
        defaultSettings.serviceRewardMaxDiscountPercent,
      ],
      ['shop_reward_earn_percent', defaultSettings.shopRewardEarnPercent],
      [
        'shop_reward_max_discount_percent',
        defaultSettings.shopRewardMaxDiscountPercent,
      ],
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
       (id, badge, title, subtitle, button_label, category_id, category_title, redirect_type,
        visual, image_url, primary_color, secondary_color, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        badge = EXCLUDED.badge,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        button_label = EXCLUDED.button_label,
        category_id = EXCLUDED.category_id,
        category_title = EXCLUDED.category_title,
        redirect_type = EXCLUDED.redirect_type,
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
        payload.redirectType || payload.redirect_type || 'category',
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

  static async deleteSlide(id) {
    await this.ensureSchema();
    const [result] = await pool.query('DELETE FROM home_slides WHERE id = ?', [id]);
    if (!Number(result?.affectedRows || result?.rowCount || 0)) {
      throw new Error('Home header slide was not found.');
    }
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
      if (row.setting_key === 'minimum_booking_lead_hours') {
        settings.minimumBookingLeadHours = Math.max(0, Math.min(168, Number(row.setting_value) || 0));
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
      if (row.setting_key === 'reward_enabled') {
        settings.rewardEnabled =
          row.setting_value === '1' || row.setting_value === 'true';
      }
      if (row.setting_key === 'reward_point_value') {
        settings.rewardPointValue = Number(row.setting_value);
      }
      if (row.setting_key === 'reward_minimum_redeem') {
        settings.rewardMinimumRedeem = Number(row.setting_value);
      }
      if (row.setting_key === 'service_reward_points_on_completion') {
        settings.serviceRewardPointsOnCompletion = Number(row.setting_value);
      }
      if (row.setting_key === 'service_reward_max_discount_percent') {
        settings.serviceRewardMaxDiscountPercent = Number(row.setting_value);
      }
      if (row.setting_key === 'shop_reward_earn_percent') {
        settings.shopRewardEarnPercent = Number(row.setting_value);
      }
      if (row.setting_key === 'shop_reward_max_discount_percent') {
        settings.shopRewardMaxDiscountPercent = Number(row.setting_value);
      }
      if (row.setting_key === 'reward_points_per_booking') {
        settings.serviceRewardPointsOnCompletion = Number(row.setting_value);
      }
      if (row.setting_key === 'reward_points_for_free_service') {
        const legacyPoints = Number(row.setting_value);
        if (legacyPoints > 0) {
          settings.rewardMinimumRedeem =
            legacyPoints * Number(settings.rewardPointValue || 25);
        }
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
      minimum_booking_lead_hours: Math.max(
        0,
        Math.min(168, Number(payload.minimumBookingLeadHours ?? defaultSettings.minimumBookingLeadHours) || 0),
      ),
      currency: payload.currency || defaultSettings.currency,
      support_phone: payload.supportPhone || defaultSettings.supportPhone,
      shipping_cost: Number(payload.shippingCost ?? defaultSettings.shippingCost),
      reward_enabled:
        payload.rewardEnabled === false || payload.rewardEnabled === 'false'
          ? '0'
          : '1',
      reward_point_value: Math.max(
        1,
        Number(payload.rewardPointValue ?? defaultSettings.rewardPointValue),
      ),
      reward_minimum_redeem: Math.max(
        0,
        Number(
          payload.rewardMinimumRedeem ?? defaultSettings.rewardMinimumRedeem,
        ),
      ),
      service_reward_points_on_completion: Math.max(
        0,
        Number(
          payload.serviceRewardPointsOnCompletion ??
            defaultSettings.serviceRewardPointsOnCompletion,
        ),
      ),
      service_reward_max_discount_percent: Math.max(
        0,
        Number(
          payload.serviceRewardMaxDiscountPercent ??
            defaultSettings.serviceRewardMaxDiscountPercent,
        ),
      ),
      shop_reward_earn_percent: Math.max(
        0,
        Number(
          payload.shopRewardEarnPercent ?? defaultSettings.shopRewardEarnPercent,
        ),
      ),
      shop_reward_max_discount_percent: Math.max(
        0,
        Number(
          payload.shopRewardMaxDiscountPercent ??
            defaultSettings.shopRewardMaxDiscountPercent,
        ),
      ),
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



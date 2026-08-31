import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const rawPool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'ustaadpro_db',
        max: Number(process.env.DB_POOL_SIZE || 10),
      },
);

// ═══════════════════════════════════════
// WHATSAPP-BOT TABLES (Auto-create)
// ═══════════════════════════════════════
export const ensurePinColumns = async () => {
    try {
        await rawPool.query(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255) DEFAULT NULL`
        );
        await rawPool.query(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMP DEFAULT NULL`
        );
        console.log('✅ PIN columns are ready!');
    } catch (error) {
        console.error('❌ PIN column migration failed:', error.message);
    }
};

export const createWhatsAppBotTables = async () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS bot_services (
            id SERIAL PRIMARY KEY,
            category VARCHAR(100) NOT NULL,
            name VARCHAR(200) NOT NULL,
            msg TEXT NOT NULL,
            options JSONB DEFAULT '[]'::jsonb,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS bot_bookings (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            main_category VARCHAR(100),
            service_type VARCHAR(200),
            sub_service TEXT,
            date VARCHAR(50),
            time VARCHAR(50),
            address TEXT,
            address_type VARCHAR(20),
            has_image VARCHAR(50),
            image_data BYTEA,
            image_mime VARCHAR(50),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS bot_sessions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(50) UNIQUE NOT NULL,
            step VARCHAR(50) DEFAULT 'MAIN_MENU',
            order_details JSONB DEFAULT '{}'::jsonb,
            current_service_key VARCHAR(10),
            current_service_type VARCHAR(20),
            change_date_temp VARCHAR(50),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200),
            phone VARCHAR(30),
            service VARCHAR(200),
            sub_service VARCHAR(200),
            description TEXT,
            images JSONB DEFAULT '[]'::jsonb,
            status VARCHAR(30) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];
    // ... rest same

    try {
        for (const query of queries) {
            await rawPool.query(query);
        }
        console.log('✅ WhatsApp Bot tables are ready!');
    } catch (error) {
        console.error('❌ WhatsApp Bot table creation failed:', error.message);
    }
};

// Auto-create tables on startup. Export the promise so one-off scripts can
// wait for it before closing the shared connection pool.
export const whatsAppBotTablesReady = createWhatsAppBotTables();
export const pinColumnsReady = ensurePinColumns();

// ═══════════════════════════════════════
// USTADPRO EXISTING CODE (UNCHANGED)
// ═══════════════════════════════════════

const lowerCamelAliases = {
  bookedfor: 'bookedFor',
  buttonlabel: 'buttonLabel',
  categoryid: 'categoryId',
  categorytitle: 'categoryTitle',
  cancelreason: 'cancelReason',
  createdat: 'createdAt',
  customeremail: 'customerEmail',
  customername: 'customerName',
  customerphone: 'customerPhone',
  detaildescription: 'detailDescription',
  fcmtoken: 'fcmToken',
  imageurl: 'imageUrl',
  inspectionfee: 'inspectionFee',
  isactive: 'isActive',
  isdefault: 'isDefault',
  originalprice: 'originalPrice',
  paymentmethod: 'paymentMethod',
  primarycolor: 'primaryColor',
  rewarddiscount: 'rewardDiscount',
  rewardpointsearned: 'rewardPointsEarned',
  rewardpointsredeemed: 'rewardPointsRedeemed',
  rewardpoints: 'rewardPoints',
  rewardenabled: 'rewardEnabled',
  rewardpointvalue: 'rewardPointValue',
  rewardminimumredeem: 'rewardMinimumRedeem',
  rewardpointsperbooking: 'rewardPointsPerBooking',
  rewardpointsforfreeservice: 'rewardPointsForFreeService',
  servicerewardpointsoncompletion: 'serviceRewardPointsOnCompletion',
  servicerewardmaxdiscountpercent: 'serviceRewardMaxDiscountPercent',
  shoprewardearnpercent: 'shopRewardEarnPercent',
  shoprewardmaxdiscountpercent: 'shopRewardMaxDiscountPercent',
  reviewcomment: 'review_comment',
  reviewid: 'review_id',
  reviewrating: 'review_rating',
  secondarycolor: 'secondaryColor',
  shippingcost: 'shippingCost',
  sortorder: 'sortOrder',
  specialinstructions: 'specialInstructions',
  userid: 'userId',
  walletbalance: 'walletBalance',
};

function toCamelCase(key) {
  return key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return row;
  }

  const next = { ...row };
  for (const [key, value] of Object.entries(row)) {
    if (key.includes('_')) {
      const camelKey = toCamelCase(key);
      if (!(camelKey in next)) {
        next[camelKey] = value;
      }
    }

    const alias = lowerCamelAliases[key];
    if (alias && !(alias in next)) {
      next[alias] = value;
    }
  }

  return next;
}

function replaceMysqlPlaceholders(sql) {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  return sql.replace(/\?/g, match => {
    if (inSingleQuote || inDoubleQuote) {
      return match;
    }

    index += 1;
    return `$${index}`;
  });
}

function normalizeMysqlCompatSql(sql) {
  return sql
    .replace(/`/g, '')
    .replace(/\bDATABASE\s*\(\s*\)/gi, 'current_schema()');
}

function normalizeSchemaSql(sql) {
  return normalizeMysqlCompatSql(sql)
    .replace(/\bINT\s+AUTO_INCREMENT\s+PRIMARY KEY/gi, 'SERIAL PRIMARY KEY')
    .replace(/\bBIGINT\s+AUTO_INCREMENT\s+PRIMARY KEY/gi, 'BIGSERIAL PRIMARY KEY')
    .replace(/\bTINYINT\s*\(\s*1\s*\)/gi, 'SMALLINT')
    .replace(/\bTINYINT\b/gi, 'SMALLINT')
    .replace(/\bLONGTEXT\b/gi, 'TEXT')
    .replace(/\bDATETIME\b/gi, 'TIMESTAMP')
    .replace(/\bJSON\b/gi, 'JSONB')
    .replace(/\s+ENGINE=InnoDB\s+DEFAULT\s+CHARSET=utf8mb4/gi, '')
    .replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, '')
    .replace(/,\s*INDEX\s+\w+\s*\([^)]+\)/gi, '')
    .replace(/UNIQUE KEY\s+(\w+)\s*\(([^)]+)\)/gi, 'CONSTRAINT $1 UNIQUE ($2)')
    .replace(/\s+AFTER\s+\w+/gi, '')
    .replace(/ALTER TABLE\s+(\w+)\s+MODIFY COLUMN\s+([^;]+)/gi, '-- noop mysql modify column');
}

function prepareSql(sql) {
  const trimmed = sql.trim();
  if (/^SET\s+FOREIGN_KEY_CHECKS\s*=/i.test(trimmed)) {
    return '-- noop mysql foreign key checks';
  }

  if (/^TRUNCATE\s+TABLE\b/i.test(trimmed) && !/\bCASCADE\b/i.test(trimmed)) {
    sql = `${trimmed} CASCADE`;
  }

  const schemaSql = /^(CREATE|ALTER|DROP)\b/i.test(trimmed)
    ? normalizeSchemaSql(sql)
    : normalizeMysqlCompatSql(sql);

  return replaceMysqlPlaceholders(schemaSql);
}

async function query(sql, params = []) {
  const preparedSql = prepareSql(sql);

  if (/^-- noop mysql (modify column|foreign key checks)/i.test(preparedSql.trim())) {
    return [{ affectedRows: 0, rowCount: 0 }, undefined];
  }

  const result = await rawPool.query(preparedSql, params);

  if (result.command === 'SELECT' || result.rows.length) {
    return [result.rows.map(normalizeRow), result.fields];
  }

  return [
    {
      affectedRows: result.rowCount,
      rowCount: result.rowCount,
    },
    result.fields,
  ];
}

async function end() {
  await rawPool.end();
}

async function getConnection() {
  return {
    query,
    release() {},
  };
}

// ═══════════════════════════════════════
// CONNECT & INITIALIZE
// ═══════════════════════════════════════
export const connectDB = async () => {
    try {
        const client = await rawPool.connect();
        console.log('✅ PostgreSQL Connected Successfully!');
        console.log(`📊 Database: ${process.env.DB_NAME || 'ustaadpro_db'}`);
        await createWhatsAppBotTables();
        await ensurePinColumns();
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
};

export default {
  query,
  getConnection,
  end,
  raw: rawPool,
};
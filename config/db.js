import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {Pool} = pg;

const rawPool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DB_SSL === 'true'
            ? {rejectUnauthorized: false}
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

  const next = {...row};
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
    return [{affectedRows: 0, rowCount: 0}, undefined];
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

export default {
  query,
  getConnection,
  end,
  raw: rawPool,
};

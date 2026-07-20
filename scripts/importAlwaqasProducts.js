import xlsx from 'xlsx';
import Shop from '../models/Shop.js';
import pool from '../config/db.js';

const defaultWorkbookPath = 'alwaqas_hardware_and_tools_products.xlsx';
const workbookPath = process.argv[2] || defaultWorkbookPath;

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function numberValue(value, fallback = 0) {
  const normalized = Number(
    String(value ?? '')
      .replace(/[^\d.-]/g, '')
      .trim(),
  );
  return Number.isFinite(normalized) ? normalized : fallback;
}

function titleCaseCategory(value) {
  const text = cleanText(value) || 'Tools';
  return text
    .split(/[\s_-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizedHeader(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getColumnIndex(headers, name) {
  return headers.findIndex(header => normalizedHeader(header) === normalizedHeader(name));
}

function getValue(row, index) {
  return index >= 0 ? row[index] : '';
}

async function importProducts() {
  const workbook = xlsx.readFile(workbookPath);
  const sheet = workbook.Sheets.Products || workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, {header: 1, defval: ''});
  const headers = rows[0] || [];
  const columns = {
    id: getColumnIndex(headers, 'Product ID'),
    title: getColumnIndex(headers, 'Product Name'),
    category: getColumnIndex(headers, 'Category'),
    currentPrice: getColumnIndex(headers, 'Current Price'),
    updatedPrice: getColumnIndex(headers, 'Updated Price'),
    unit: getColumnIndex(headers, 'Unit'),
    availability: getColumnIndex(headers, 'Availability'),
    shortDescription: getColumnIndex(headers, 'Short Description'),
    detailDescription: getColumnIndex(headers, 'Detail Description'),
    imageUrl: getColumnIndex(headers, 'Image URL'),
  };

  if (columns.id < 0 || columns.title < 0 || columns.updatedPrice < 0) {
    throw new Error('Workbook must include Product ID, Product Name, and Updated Price columns.');
  }

  await Shop.ensureTables();
  const [existingRows] = await pool.query('SELECT id, price FROM shop_products');
  const existingMap = new Map(existingRows.map(product => [product.id, Number(product.price)]));
  const operations = [];
  let priceUpdated = 0;
  let created = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const row of rows.slice(1)) {
    const sourceId = cleanText(getValue(row, columns.id));
    const title = cleanText(getValue(row, columns.title));
    const id = slugify(sourceId);
    const currentPrice = numberValue(getValue(row, columns.currentPrice));
    const updatedPrice = numberValue(
      getValue(row, columns.updatedPrice),
      currentPrice,
    );
    const price = updatedPrice || currentPrice;

    if (!sourceId || !title || price <= 0) {
      skipped += 1;
      continue;
    }

    const availability = cleanText(getValue(row, columns.availability)).toLowerCase();
    const category = titleCaseCategory(getValue(row, columns.category));
    const description =
      cleanText(getValue(row, columns.detailDescription)) ||
      cleanText(getValue(row, columns.shortDescription)) ||
      title;
    const imageUrl = cleanText(getValue(row, columns.imageUrl));
    const stock = availability.includes('out')
      ? 0
      : Math.max(0, Math.floor(numberValue(getValue(row, columns.unit), 100)));

    const existingId = existingMap.has(sourceId)
      ? sourceId
      : existingMap.has(id)
        ? id
        : null;

    if (existingId) {
      const oldPrice = existingMap.get(existingId);
      // Update price and all product details for existing products
      operations.push(async () => {
        await pool.query(
          `UPDATE shop_products
           SET price = $1, title = $2, category = $3, description = $4,
               original_price = $5, image_url = $6, stock = $7,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $8`,
          [price, title, category, description, oldPrice || price, imageUrl, stock, existingId],
        );
        if (oldPrice !== price) {
          priceUpdated += 1;
        } else {
          unchanged += 1;
        }
      });
      continue;
    }

    // New product — insert with full details from the spreadsheet
    const product = {
      id,
      title,
      category,
      description,
      price,
      originalPrice: currentPrice || price,
      imageUrl,
      stock,
      isActive: true,
    };
    operations.push(async () => {
      await pool.query(
        `INSERT INTO shop_products
         (id, title, category, description, price, original_price, image_url, stock, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           original_price = EXCLUDED.original_price,
           image_url = EXCLUDED.image_url,
           stock = EXCLUDED.stock,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP`,
        [
          product.id,
          product.title,
          product.category,
          product.description,
          product.price,
          product.originalPrice,
          product.imageUrl,
          product.stock,
          1,
        ],
      );
      created += 1;
    });
  }

  // The remote database is much faster with small concurrent batches than one
  // request per product, while keeping the import load bounded.
  const batchSize = 20;
  for (let index = 0; index < operations.length; index += batchSize) {
    await Promise.all(operations.slice(index, index + batchSize).map(run => run()));
  }

  console.log('');
  console.log('=== Alwaqas Product Import Summary ===');
  console.log(`  Updated prices : ${priceUpdated} products`);
  console.log(`  Newly created  : ${created} products`);
  console.log(`  Unchanged      : ${unchanged} products`);
  console.log(`  Skipped (empty): ${skipped} rows`);
  console.log(`  Total processed: ${operations.length} products`);
  console.log('======================================');
}

importProducts()
  .catch(error => {
    console.error('Alwaqas product import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

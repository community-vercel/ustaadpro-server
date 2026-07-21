import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import https from 'node:https';
import xlsx from 'xlsx';
import Shop from '../models/Shop.js';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const defaultWorkbookPath = path.join(projectRoot, 'alwaqas_hardware_and_tools_products.xlsx');
const workbookPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultWorkbookPath;
const uploadDir = path.join(projectRoot, 'uploads', 'shop-products');
const publicUploadBase = '/uploads/shop-products';

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

function getArchiveFile(cfb, name) {
  return cfb.FileIndex.find(file => file.name === name);
}

function bufferToString(file) {
  return Buffer.from(file?.content || []).toString('utf8');
}

function getImageMapByExcelRow(cfb) {
  const drawing = bufferToString(getArchiveFile(cfb, 'drawing1.xml'));
  const rels = bufferToString(getArchiveFile(cfb, 'drawing1.xml.rels'));
  const relMap = new Map();

  for (const match of rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="\.\.\/media\/([^"]+)"/g)) {
    relMap.set(match[1], match[2]);
  }

  const imageMap = new Map();
  const anchorRegex =
    /<xdr:oneCellAnchor>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"[\s\S]*?<\/xdr:oneCellAnchor>/g;

  for (const match of drawing.matchAll(anchorRegex)) {
    const excelRow = Number(match[1]) + 1;
    const imageName = relMap.get(match[2]);
    if (imageName) {
      imageMap.set(excelRow, imageName);
    }
  }

  return imageMap;
}

async function writeEmbeddedProductImage(cfb, productId, imageName) {
  if (!imageName) return '';
  const file = getArchiveFile(cfb, imageName);
  if (!file?.content) return '';

  await fs.mkdir(uploadDir, {recursive: true});
  const ext = path.extname(imageName) || '.png';
  const filename = `${productId}${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), Buffer.from(file.content));
  return `${publicUploadBase}/${filename}`;
}

function downloadImageFile(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Failed to download: ${res.statusCode}`));
      }
      // Follow redirect if needed? The simple implementation handles direct https links.
      if (res.statusCode === 301 || res.statusCode === 302) {
         if(res.headers.location) {
             return https.get(res.headers.location, (redirectRes) => {
                 const writeStream = createWriteStream(filepath);
                 redirectRes.pipe(writeStream);
                 writeStream.on('finish', () => writeStream.close(resolve));
                 writeStream.on('error', reject);
             }).on('error', reject);
         }
      }
      
      const writeStream = createWriteStream(filepath);
      res.pipe(writeStream);
      writeStream.on('finish', () => writeStream.close(resolve));
      writeStream.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadProductImage(productId, url) {
  if (!url || !url.startsWith('http')) return '';
  
  try {
    await fs.mkdir(uploadDir, {recursive: true});
    
    // Attempt to guess extension from url or fallback to .jpg
    let ext = path.extname(new URL(url).pathname);
    if (!ext || ext.length > 5) ext = '.jpg';
    
    const filename = `${productId}${ext}`;
    const filepath = path.join(uploadDir, filename);
    
    await downloadImageFile(url, filepath);
    return `${publicUploadBase}/${filename}`;
  } catch (error) {
    console.error(`  Warning: Failed to download image for ${productId} (${url}): ${error.message}`);
    return '';
  }
}

async function importProducts() {
  try {
    await fs.access(workbookPath);
  } catch {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const workbook = xlsx.readFile(workbookPath);
  const sheet = workbook.Sheets.Products || workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, {header: 1, defval: ''});
  
  let cfb = null;
  let imageMap = new Map();
  try {
    cfb = xlsx.CFB.read(workbookPath, {type: 'file'});
    imageMap = getImageMapByExcelRow(cfb);
  } catch (err) {
    console.log('No CFB archive found or failed to parse embedded images. Proceeding with external URLs only.');
  }

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
  
  let priceUpdated = 0;
  let created = 0;
  let skipped = 0;
  let unchanged = 0;
  let imagesExtracted = 0;
  let imagesDownloaded = 0;

  console.log('Processing products (this may take a minute due to image downloads)...');

  // Process sequentially to avoid overwhelming the network with too many concurrent image downloads
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    const sourceId = cleanText(getValue(row, columns.id));
    const title = cleanText(getValue(row, columns.title));
    const id = slugify(sourceId);
    const currentPrice = numberValue(getValue(row, columns.currentPrice));
    const updatedPrice = numberValue(getValue(row, columns.updatedPrice), currentPrice);
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
    const stock = availability.includes('out')
      ? 0
      : Math.max(0, Math.floor(numberValue(getValue(row, columns.unit), 100)));

    // Image logic
    let localImageUrl = '';
    const excelRow = index + 1; // 1-based header is row 1
    const embeddedImageName = imageMap.get(excelRow);
    const rawImageUrl = cleanText(getValue(row, columns.imageUrl));

    if (embeddedImageName && cfb) {
      localImageUrl = await writeEmbeddedProductImage(cfb, id, embeddedImageName);
      if (localImageUrl) imagesExtracted++;
    } else if (rawImageUrl && rawImageUrl.startsWith('http')) {
      localImageUrl = await downloadProductImage(id, rawImageUrl);
      if (localImageUrl) imagesDownloaded++;
    }

    const existingId = existingMap.has(sourceId)
      ? sourceId
      : existingMap.has(id)
        ? id
        : null;

    if (existingId) {
      const oldPrice = existingMap.get(existingId);
      await pool.query(
        `UPDATE shop_products
         SET price = $1, title = $2, category = $3, description = $4,
             original_price = $5, image_url = $6, stock = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [price, title, category, description, oldPrice || price, localImageUrl || rawImageUrl, stock, existingId],
      );
      if (oldPrice !== price) {
        priceUpdated += 1;
      } else {
        unchanged += 1;
      }
    } else {
      // New product
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
          id,
          title,
          category,
          description,
          price,
          currentPrice || price,
          localImageUrl || rawImageUrl,
          stock,
          1,
        ],
      );
      created += 1;
    }
  }

  console.log('');
  console.log('=== Alwaqas Product Import Summary ===');
  console.log(`  Updated prices    : ${priceUpdated} products`);
  console.log(`  Newly created     : ${created} products`);
  console.log(`  Unchanged         : ${unchanged} products`);
  console.log(`  Skipped (empty)   : ${skipped} rows`);
  console.log(`  Images Extracted  : ${imagesExtracted} (Embedded in Excel)`);
  console.log(`  Images Downloaded : ${imagesDownloaded} (From URLs)`);
  console.log(`  Total processed   : ${priceUpdated + created + unchanged} products`);
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

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import xlsx from 'xlsx';
import pool, {whatsAppBotTablesReady} from '../config/db.js';
import AppControl from '../models/AppControl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE = 'C:/Users/Sharplogicians/Desktop/updated_new_services_ustaadpro.xlsx';
const UPLOAD_DIRECTORY = path.resolve(__dirname, '../uploads/service-catalog');
const SOURCE_FILE = process.argv.find(arg => arg.toLowerCase().endsWith('.xlsx')) || DEFAULT_SOURCE;
const DRY_RUN = process.argv.includes('--dry-run');

const CATEGORY_STYLE = {
  Electrician: {id: 'electrician', icon: 'lightning-bolt', tint: '#F59E0B'},
  'Home Services': {id: 'home-services', icon: 'home', tint: '#006C49'},
  Plumber: {id: 'plumber', icon: 'wrench', tint: '#0891B2'},
  Painter: {id: 'painter', icon: 'paintbrush', tint: '#8B5CF6'},
  Carpenter: {id: 'carpenter', icon: 'hammer', tint: '#A16207'},
  Welder: {id: 'welder', icon: 'flame', tint: '#DC2626'},
  CCTV: {id: 'cctv', icon: 'camera', tint: '#0F766E'},
  HVAC: {id: 'hvac', icon: 'wind', tint: '#2563EB'},
  'Office Maintenance': {id: 'office-maintenance', icon: 'building', tint: '#475569'},
};

const text = value => String(value ?? '').trim();
const first = (...values) => values.map(text).find(Boolean) || '';
const asPrice = value => Number(String(value ?? 0).replace(/,/g, '')) || 0;
const stableId = (prefix, parts) =>
  `${prefix}-${createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 14)}`;
const assetHash = value => createHash('sha1').update(value).digest('hex').slice(0, 24);

function extensionFrom(contentType, url) {
  const type = String(contentType || '').toLowerCase().split(';')[0];
  const extensions = {'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg'};
  if (extensions[type]) return extensions[type];
  const match = String(url).split('?')[0].match(/\.(jpe?g|png|webp|gif|svg)$/i);
  return match ? `.${match[1].toLowerCase()}`.replace('.jpeg', '.jpg') : '.jpg';
}

function readRows(filePath) {
  const workbook = xlsx.readFile(filePath, {cellDates: false});
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(worksheet, {defval: ''}).map((row, index) => ({
    excelRow: index + 2,
    mainCategory: first(row['Main Category']),
    mobileIconUrl: first(row['main category icon for  moible'], row['main category icon for mobile']),
    webImageUrl: first(row['main category images for  web / desktop']),
    subcategory: first(row['Sub Category']),
    subcategoryImageUrl: first(row['Sub category Image']),
    service: first(row.Service),
    price: asPrice(row['Price (PKR)']),
    unitDescription: first(row['Unit/Description']),
    serviceImageUrl: first(row['Services Images']),
  })).filter(row => row.mainCategory && row.service);
}

function embeddedImageMap(filePath) {
  const archive = xlsx.CFB.read(fsSync.readFileSync(filePath), {type: 'buffer'});
  const getEntry = entryPath => xlsx.CFB.find(archive, `Root Entry/${entryPath}`)?.content;
  const drawing = getEntry('xl/drawings/drawing1.xml');
  const relationships = getEntry('xl/drawings/_rels/drawing1.xml.rels');
  if (!drawing || !relationships) return new Map();

  const relText = Buffer.from(relationships).toString('utf8');
  const rels = Object.fromEntries(
    [...relText.matchAll(/<Relationship\s+Id="([^"]+)"\s+Type="[^"]+"\s+Target="([^"]+)"/g)]
      .map(match => [match[1], match[2]]),
  );
  const images = new Map();
  const drawingText = Buffer.from(drawing).toString('utf8');
  for (const match of drawingText.matchAll(/<xdr:(?:oneCellAnchor|twoCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g)) {
    const anchor = match[1];
    const column = Number((anchor.match(/<xdr:col>(\d+)<\/xdr:col>/) || [])[1]);
    const row = Number((anchor.match(/<xdr:row>(\d+)<\/xdr:row>/) || [])[1]);
    const relationId = (anchor.match(/r:embed="([^"]+)"/) || [])[1];
    const target = rels[relationId];
    if (!Number.isInteger(column) || !Number.isInteger(row) || !target) continue;
    const mediaPath = path.posix.normalize(path.posix.join('xl/drawings', target));
    const content = getEntry(mediaPath);
    if (!content) continue;
    images.set(`${row + 1}:${column}`, {content: Buffer.from(content), extension: path.extname(mediaPath) || '.jpg'});
  }
  return images;
}

async function storeEmbeddedAsset(asset, kind, cache) {
  if (!asset?.content?.length) return '';
  const key = createHash('sha1').update(asset.content).digest('hex');
  if (cache.has(key)) return cache.get(key);
  const task = (async () => {
    const name = `${kind}-${key.slice(0, 24)}${asset.extension.toLowerCase()}`;
    await fs.mkdir(UPLOAD_DIRECTORY, {recursive: true});
    await fs.writeFile(path.join(UPLOAD_DIRECTORY, name), asset.content);
    return `/uploads/service-catalog/${name}`;
  })();
  cache.set(key, task);
  return task;
}
async function downloadAsset(url, kind, cache) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return url;
  if (!/^https?:\/\//i.test(url)) {
    console.warn(`Skipping unsupported ${kind} image URL: ${url}`);
    return '';
  }
  if (cache.has(url)) return cache.get(url);

  const task = (async () => {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {'User-Agent': 'UstaadPro-service-catalog-seed/1.0'},
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) throw new Error(`expected image, received ${contentType || 'unknown content type'}`);
      const content = Buffer.from(await response.arrayBuffer());
      if (!content.length || content.length > 10 * 1024 * 1024) throw new Error('invalid image size');
      const name = `${kind}-${assetHash(url)}${extensionFrom(contentType, url)}`;
      const destination = path.join(UPLOAD_DIRECTORY, name);
      await fs.mkdir(UPLOAD_DIRECTORY, {recursive: true});
      await fs.writeFile(destination, content);
      return `/uploads/service-catalog/${name}`;
    } catch (error) {
      console.warn(`Image download failed (${kind}): ${url} — ${error.message}`);
      return '';
    }
  })();
  cache.set(url, task);
  return task;
}

async function hydrateAssets(rows) {
  const remoteCache = new Map();
  const embeddedCache = new Map();
  const embeddedImages = embeddedImageMap(SOURCE_FILE);
  for (const row of rows) {
    row.mobileIconUrl = await storeEmbeddedAsset(embeddedImages.get(`${row.excelRow}:2`), 'main-mobile', embeddedCache)
      || await downloadAsset(row.mobileIconUrl, 'main-mobile', remoteCache);
    row.webImageUrl = await storeEmbeddedAsset(embeddedImages.get(`${row.excelRow}:3`), 'main-web', embeddedCache)
      || await downloadAsset(row.webImageUrl, 'main-web', remoteCache);
    row.subcategoryImageUrl = await storeEmbeddedAsset(embeddedImages.get(`${row.excelRow}:5`), 'subcategory', embeddedCache)
      || await downloadAsset(row.subcategoryImageUrl, 'subcategory', remoteCache);
    row.serviceImageUrl = await storeEmbeddedAsset(embeddedImages.get(`${row.excelRow}:7`), 'service', embeddedCache)
      || await downloadAsset(row.serviceImageUrl, 'service', remoteCache);
  }

  // The current workbook has no dedicated main/subcategory art. Reuse a real
  // service image instead of displaying a broken/empty image in the app.
  for (const row of rows) {
    const categoryRows = rows.filter(item => item.mainCategory === row.mainCategory);
    const subcategoryRows = categoryRows.filter(item => item.subcategory === row.subcategory);
    const categoryFallback = categoryRows.find(item => item.serviceImageUrl)?.serviceImageUrl || '';
    const subcategoryFallback = subcategoryRows.find(item => item.serviceImageUrl)?.serviceImageUrl || categoryFallback;
    row.mobileIconUrl ||= categoryFallback;
    row.webImageUrl ||= categoryFallback;
    if (row.subcategory) row.subcategoryImageUrl ||= subcategoryFallback;
    // A remote service URL can time out. Keep each service visual by falling
    // back to its subcategory art, then the category art.
    row.serviceImageUrl ||= row.subcategoryImageUrl || categoryFallback;
  }
}

async function upsertCategory(row, sortOrder) {
  const style = CATEGORY_STYLE[row.mainCategory] || {id: row.mainCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'), icon: 'tool', tint: '#006C49'};
  await pool.query(
    `INSERT INTO categories (id, title, subtitle, icon, tint, image_url, web_image_url, mobile_icon_url, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, icon = EXCLUDED.icon,
       tint = EXCLUDED.tint, image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), categories.image_url),
       web_image_url = COALESCE(NULLIF(EXCLUDED.web_image_url, ''), categories.web_image_url),
       mobile_icon_url = COALESCE(NULLIF(EXCLUDED.mobile_icon_url, ''), categories.mobile_icon_url),
       is_active = TRUE, sort_order = EXCLUDED.sort_order`,
    [style.id, row.mainCategory, `Professional ${row.mainCategory} services`, style.icon, style.tint, row.mobileIconUrl, row.webImageUrl, row.mobileIconUrl, sortOrder],
  );
  return style.id;
}

async function upsertSubcategory(categoryId, row) {
  if (!row.subcategory) return null;
  const id = stableId('sub', [categoryId, row.subcategory]);
  await pool.query(
    `INSERT INTO subcategories (id, category_id, title, description, image_url, web_image_url, mobile_icon_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       category_id = EXCLUDED.category_id, title = EXCLUDED.title, description = EXCLUDED.description,
       image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), subcategories.image_url),
       web_image_url = COALESCE(NULLIF(EXCLUDED.web_image_url, ''), subcategories.web_image_url),
       mobile_icon_url = COALESCE(NULLIF(EXCLUDED.mobile_icon_url, ''), subcategories.mobile_icon_url)`,
    [id, categoryId, row.subcategory, `${row.subcategory} services`, row.subcategoryImageUrl, row.subcategoryImageUrl, row.subcategoryImageUrl],
  );
  return id;
}

async function upsertService(categoryId, subcategoryId, row) {
  const id = stableId('svc', [categoryId, subcategoryId || 'direct', row.service]);
  const description = row.unitDescription || `${row.service} service`;
  await pool.query(
    `INSERT INTO services (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, service_type, image_url, detail_description, details, includes, excludes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
     ON CONFLICT (id) DO UPDATE SET
       category_id = EXCLUDED.category_id, subcategory_id = EXCLUDED.subcategory_id,
       title = EXCLUDED.title, description = EXCLUDED.description, price = EXCLUDED.price,
       original_price = EXCLUDED.original_price, service_type = EXCLUDED.service_type,
       image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), services.image_url),
       detail_description = EXCLUDED.detail_description, details = EXCLUDED.details, is_active = TRUE`,
    [id, categoryId, subcategoryId, row.service, description, row.price, row.price, '60 min', 0, 0, null, row.unitDescription || 'Starting price', row.serviceImageUrl, description, JSON.stringify([row.unitDescription].filter(Boolean)), '[]', '[]'],
  );
}

async function main() {
  const rows = readRows(SOURCE_FILE);
  if (!rows.length) throw new Error(`No valid catalogue rows found in ${SOURCE_FILE}`);
  const summary = {source: SOURCE_FILE, rows: rows.length, categories: [...new Set(rows.map(row => row.mainCategory))], subcategoryGroups: [...new Set(rows.map(row => `${row.mainCategory}|${row.subcategory || '(direct)'}`))].length};
  console.log(JSON.stringify(summary, null, 2));
  if (DRY_RUN) return;

  await AppControl.ensureSchema();
  await hydrateAssets(rows);
  const categoryOrder = new Map(summary.categories.map((title, index) => [title, index + 1]));
  for (const row of rows) {
    const categoryId = await upsertCategory(row, categoryOrder.get(row.mainCategory));
    const subcategoryId = await upsertSubcategory(categoryId, row);
    await upsertService(categoryId, subcategoryId, row);
  }
  console.log(`Final service catalogue seeded: ${rows.length} services. Images are in ${UPLOAD_DIRECTORY}`);
}

main().catch(error => {
  console.error('FinalServicesUstaadPro seed failed:', error);
  process.exitCode = 1;
}).finally(async () => {
  await whatsAppBotTablesReady;
  await pool.end();
});
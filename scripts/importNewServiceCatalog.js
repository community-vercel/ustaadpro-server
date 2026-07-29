import path from 'node:path';
import {fileURLToPath} from 'node:url';
import xlsx from 'xlsx';
import {createHash} from 'node:crypto';
import pool from '../config/db.js';
import AppControl from '../models/AppControl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = 'C:/Users/Sharplogicians/Desktop/new_ustaadpro_services.xlsx';
const sourceFile = process.argv.find(arg => arg.toLowerCase().endsWith('.xlsx')) || defaultFile;
const dryRun = process.argv.includes('--dry-run');

const categoryStyle = {
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
const slug = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const stableId = (prefix, parts) => `${prefix}-${createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 14)}`;
const asPrice = value => Number(String(value ?? 0).replace(/,/g, '')) || 0;
const first = (...values) => values.map(text).find(Boolean) || '';

function readRows(filePath) {
  const workbook = xlsx.readFile(filePath, {cellDates: false});
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, {defval: ''}).map(row => ({
    mainCategory: first(row['Main Category']),
    mobileIconUrl: first(row['main category icon for  moible'], row['main category icon for mobile']),
    webImageUrl: first(row['main category images for  web / desktop']),
    subcategory: first(row['Sub Category']),
    subcategoryImageUrl: first(row['Sub category Image']),
    service: first(row['Service']),
    price: asPrice(row['Price (PKR)']),
    unitDescription: first(row['Unit/Description']),
    serviceImageUrl: first(row['Services Images']),
  })).filter(row => row.mainCategory && row.service);
}

async function upsertCategory(row, sortOrder) {
  const style = categoryStyle[row.mainCategory] || {id: slug(row.mainCategory), icon: 'tool', tint: '#006C49'};
  await pool.query(
    `INSERT INTO categories (id, title, subtitle, icon, tint, web_image_url, mobile_icon_url, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, icon = EXCLUDED.icon,
       tint = EXCLUDED.tint, is_active = TRUE, sort_order = EXCLUDED.sort_order,
       web_image_url = COALESCE(NULLIF(EXCLUDED.web_image_url, ''), categories.web_image_url),
       mobile_icon_url = COALESCE(NULLIF(EXCLUDED.mobile_icon_url, ''), categories.mobile_icon_url)`,
    [style.id, row.mainCategory, `Professional ${row.mainCategory} services`, style.icon, style.tint, row.webImageUrl, row.mobileIconUrl, sortOrder],
  );
  return style.id;
}

async function upsertSubcategory(categoryId, row) {
  if (!row.subcategory) return null;
  const id = stableId('sub', [categoryId, row.subcategory]);
  await pool.query(
    `INSERT INTO subcategories (id, category_id, title, description, web_image_url, mobile_icon_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       web_image_url = COALESCE(NULLIF(EXCLUDED.web_image_url, ''), subcategories.web_image_url),
       mobile_icon_url = COALESCE(NULLIF(EXCLUDED.mobile_icon_url, ''), subcategories.mobile_icon_url)`,
    [id, categoryId, row.subcategory, `${row.subcategory} services`, row.subcategoryImageUrl, row.subcategoryImageUrl],
  );
  return id;
}

async function upsertService(categoryId, subcategoryId, row) {
  const id = stableId('svc', [categoryId, subcategoryId || 'direct', row.service]);
  const description = row.unitDescription || `${row.service} service`;
  await pool.query(
    `INSERT INTO services
      (id, category_id, subcategory_id, title, description, price, original_price,
       duration, rating, reviews, badge, service_type, image_url, detail_description,
       details, includes, excludes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       category_id = EXCLUDED.category_id, subcategory_id = EXCLUDED.subcategory_id,
       title = EXCLUDED.title, description = EXCLUDED.description, price = EXCLUDED.price,
       original_price = EXCLUDED.original_price, service_type = EXCLUDED.service_type,
       image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), services.image_url),
       detail_description = EXCLUDED.detail_description`,
    [id, categoryId, subcategoryId, row.service, description, row.price, row.price,
      '60 min', 0, 0, null, row.unitDescription || 'Standard Visit', row.serviceImageUrl,
      description, JSON.stringify([row.unitDescription].filter(Boolean)), '[]', '[]'],
  );
}

async function main() {
  const rows = readRows(sourceFile);
  if (!rows.length) throw new Error('No valid catalog rows found in ' + sourceFile);
  const summary = {
    rows: rows.length,
    categories: [...new Set(rows.map(row => row.mainCategory))],
    subcategories: [...new Set(rows.map(row => `${row.mainCategory}|${row.subcategory || '(direct)'}`))].length,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) return;

  await AppControl.ensureSchema();
  const categoryOrder = new Map(summary.categories.map((title, index) => [title, index + 1]));
  for (const row of rows) {
    const categoryId = await upsertCategory(row, categoryOrder.get(row.mainCategory) || 999);
    const subcategoryId = await upsertSubcategory(categoryId, row);
    await upsertService(categoryId, subcategoryId, row);
  }
  const activeCategoryIds = [...new Set(rows.map(row => (categoryStyle[row.mainCategory] || {id: slug(row.mainCategory)}).id))];
  const placeholders = activeCategoryIds.map(() => '?').join(', ');
  await pool.query(`UPDATE categories SET is_active = FALSE WHERE id NOT IN (${placeholders})`, activeCategoryIds);
  console.log(`Imported ${rows.length} services from ${sourceFile}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => pool.end());
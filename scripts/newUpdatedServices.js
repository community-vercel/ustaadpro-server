import fs from 'node:fs';
import path from 'node:path';
import {PDFParse} from 'pdf-parse';
import pool from '../config/db.js';
import AppControl from '../models/AppControl.js';

const defaultPdf = 'C:/Users/Sharplogicians/Desktop/ustaapro_Updated_services.pdf';
const mainServiceMeta = {
  Electrician: {icon: 'lightning-bolt', tint: '#F59E0B'}, 'Home Services': {icon: 'home', tint: '#006C49'}, Plumber: {icon: 'wrench', tint: '#0891B2'}, Painter: {icon: 'paintbrush', tint: '#8B5CF6'}, Carpenter: {icon: 'hammer', tint: '#A16207'}, Welder: {icon: 'flame', tint: '#DC2626'}, CCTV: {icon: 'camera', tint: '#0F766E'}, HVAC: {icon: 'wind', tint: '#2563EB'}, 'Office Maintenance': {icon: 'building', tint: '#475569'},
};
const knownSubservices = {
  Electrician: ['DB Board & Breaker Services', 'Fan Services', 'General Electric Work (Light / Switches / Others)', 'UPS/Inverter Installation & Repair', 'TV Installation & Repair', 'Automatic Machine Services'],
  'Home Services': ['Sofa Cleaning Services', 'Water Tank Cleaning Services', 'Deep Cleaning', 'Gardening Services'], Plumber: ['General Repair'],
};
const slug = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const priceNumber = value => Number(String(value).replace(/,/g, ''));

function parseRows(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const match = line.match(/^(\d+) (Electrician|Home Services|Plumber|Painter|Carpenter|Welder|CCTV|HVAC|Office Maintenance) (.+)$/);
    if (!match) continue;
    const [, rowNumber, mainTitle, rawTail] = match;
    const urlMatch = rawTail.match(/(https?:\/\/\S+)$/i);
    const imageUrl = urlMatch ? urlMatch[1] : '';
    const tail = (urlMatch ? rawTail.slice(0, -imageUrl.length) : rawTail).trim();
    const priceMatch = [...tail.matchAll(/\s(\d{1,3}(?:,\d{3})*)\s+(?=(?:starting|per|visit|vary)\b)/gi)].pop() || [...tail.matchAll(/\s(\d{1,3}(?:,\d{3})*)\s*$/g)].pop();
    if (!priceMatch) { console.warn('Skipped row with no price:', rowNumber); continue; }
    const beforePrice = tail.slice(0, priceMatch.index).trim();
    const unit = tail.slice((priceMatch.index || 0) + priceMatch[0].length).trim() || 'Starting price';
    const subTitle = (knownSubservices[mainTitle] || []).find(item => beforePrice.startsWith(item));
    const title = (subTitle ? beforePrice.slice(subTitle.length) : beforePrice).trim();
    if (title) rows.push({mainTitle, subTitle: subTitle || null, title, price: priceNumber(priceMatch[1]), unit, imageUrl});
  }
  return rows;
}

async function main() {
  if (process.argv[2] === '--help') {
    console.log('Usage: npm run seed:updated-services -- [path-to-ustaapro_Updated_services.pdf]');
    return;
  }
  const dryRun = process.argv.includes('--dry-run');
  const suppliedPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const pdfPath = path.resolve(suppliedPath || defaultPdf);
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not found: ' + pdfPath);
  const parser = new PDFParse({data: fs.readFileSync(pdfPath)});
  const result = await parser.getText();
  await parser.destroy();
  const rows = parseRows(result.text);
  if (!rows.length) throw new Error('No services were read from the PDF.');
  if (dryRun) {
    console.log('Dry run: read ' + rows.length + ' services from the PDF.');
    console.log('Main services: ' + [...new Set(rows.map(row => row.mainTitle))].join(', '));
    return;
  }
  // The live database is PostgreSQL. Keep this migration in the seed so it
  // also works on deployments created before category/subcategory images existed.
  await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT');
  await pool.query('ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS image_url TEXT');
  await AppControl.ensureSchema();
  for (const row of rows) {
    const categoryId = slug(row.mainTitle);
    const meta = mainServiceMeta[row.mainTitle] || {icon: 'tool', tint: '#006C49'};
    await pool.query('INSERT INTO categories (id, title, subtitle, icon, tint, image_url) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, icon = EXCLUDED.icon, tint = EXCLUDED.tint, image_url = COALESCE(NULLIF(EXCLUDED.image_url, \'\'), categories.image_url)', [categoryId, row.mainTitle, 'Professional ' + row.mainTitle + ' services', meta.icon, meta.tint, row.imageUrl || null]);
    const subcategoryId = row.subTitle ? slug(categoryId + '-' + row.subTitle) : null;
    if (subcategoryId) await pool.query('INSERT INTO subcategories (id, category_id, title, description, image_url) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, image_url = COALESCE(NULLIF(EXCLUDED.image_url, \'\'), subcategories.image_url)', [subcategoryId, categoryId, row.subTitle, row.subTitle + ' services', row.imageUrl || null]);
    const id = slug([categoryId, subcategoryId || 'direct', row.title].join('-'));
    const description = row.title + ' ? ' + row.unit;
    await pool.query('INSERT INTO services (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, service_type, image_url, detail_description, details, includes, excludes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, subcategory_id = EXCLUDED.subcategory_id, title = EXCLUDED.title, description = EXCLUDED.description, price = EXCLUDED.price, original_price = EXCLUDED.original_price, duration = EXCLUDED.duration, service_type = EXCLUDED.service_type, image_url = EXCLUDED.image_url, detail_description = EXCLUDED.detail_description, details = EXCLUDED.details, includes = EXCLUDED.includes, excludes = EXCLUDED.excludes', [id, categoryId, subcategoryId, row.title, description, row.price, row.price, '60 min', 0, 0, null, row.unit, row.imageUrl || null, description, JSON.stringify([row.unit]), JSON.stringify([]), JSON.stringify([])]);
  }
  console.log('Seeded ' + rows.length + ' updated services with main-service, sub-service and service images.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

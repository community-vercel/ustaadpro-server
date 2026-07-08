import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import Shop from '../models/Shop.js';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workbookFileName = 'alwaqas_hardware_and_tools_products.xlsx';
const defaultWorkbookPath = path.join(projectRoot, workbookFileName);
const workbookPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultWorkbookPath;
const uploadDir = path.join(projectRoot, 'uploads', 'shop-products');
const publicUploadBase = '/uploads/shop-products';

function slugify(value) {
  return String(value || 'product')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function uniqueSlug(base, seen) {
  let slug = base || 'product';
  let suffix = 2;
  while (seen.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  seen.add(slug);
  return slug;
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
  const text = String(value || 'Tools').trim() || 'Tools';
  return text
    .split(/[\s_-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

async function writeProductImage(cfb, productId, imageName) {
  if (!imageName) return '';
  const file = getArchiveFile(cfb, imageName);
  if (!file?.content) return '';

  await fs.mkdir(uploadDir, { recursive: true });
  const ext = path.extname(imageName) || '.png';
  const filename = `${productId}${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), Buffer.from(file.content));
  return `${publicUploadBase}/${filename}`;
}

async function importProducts() {
  try {
    await fs.access(workbookPath);
  } catch {
    throw new Error(
      `Workbook not found: ${workbookPath}\n` +
        `Put ${workbookFileName} in the backend project root (${projectRoot}) ` +
        'or pass the file path: npm run seed:shop:alwaqas -- /full/path/to/file.xlsx',
    );
  }

  const workbook = xlsx.readFile(workbookPath);
  const sheet = workbook.Sheets.Products || workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const cfb = xlsx.CFB.read(workbookPath, { type: 'file' });
  const imageMap = getImageMapByExcelRow(cfb);
  const seenIds = new Set();
  let imported = 0;
  let withImages = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const title = String(row[2] || '').replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const baseId = slugify(title);
    const id = uniqueSlug(baseId, seenIds);
    const currentPrice = numberValue(row[4]);
    const updatedPrice = numberValue(row[5], currentPrice);
    const stock =
      String(row[7] || '').toLowerCase().includes('out') ? 0 : Math.max(0, Math.floor(numberValue(row[6], 100)));
    const excelRow = index + 1;
    const imageUrl = await writeProductImage(cfb, id, imageMap.get(excelRow));
    if (imageUrl) withImages += 1;

    await Shop.saveProduct({
      id,
      title,
      category: titleCaseCategory(row[3]),
      description: String(row[9] || row[8] || title).trim(),
      price: updatedPrice || currentPrice,
      originalPrice: currentPrice || updatedPrice,
      imageUrl,
      stock,
      isActive: true,
    });
    imported += 1;
  }

  console.log(`Imported ${imported} Alwaqas shop products.`);
  console.log(`Attached ${withImages} embedded product images.`);
  console.log(`Images folder: ${uploadDir}`);
}

importProducts()
  .catch(error => {
    console.error('Alwaqas product import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

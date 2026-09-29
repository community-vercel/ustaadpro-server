import pool from './config/db.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────────────────────────────────
// CONFIG — change these two values to target a different service.
// ────────────────────────────────────────────────────────────────────────────
// The service that gets the texture designs. Try ids in this order until one
// matches a service that actually exists in your database.
const SERVICE_ID_CANDIDATES = ['wall-texture-main', 'texture-painting', 'painters-texture-painting'];

// Texture sub-category designs. Edit titles/prices/images freely — each row
// becomes one selectable sub-category in the app with its own rate per sq ft.
const TEXTURE_DESIGNS = [
  {
    title: 'Wall Texture Design A',
    description: 'Modern textured wall finish',
    price: 85, // PKR per square feet
    imageFile: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800',
  },
  {
    title: 'Wall Texture Design B',
    description: 'Premium patterned wall finish',
    price: 120,
    imageFile: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800',
  },
  {
    title: 'Wall Texture Design C',
    description: 'Luxury designer wall finish',
    price: 160,
    imageFile: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800',
  },
];
// ────────────────────────────────────────────────────────────────────────────

const downloadImage = (url, prefix) => {
  return new Promise(resolve => {
    if (!url || !url.startsWith('http')) return resolve(url);
    const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/);
    let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) ext = 'jpg';

    const filename = `${prefix}_${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, 'uploads', 'services');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {recursive: true});

    const filepath = path.join(uploadsDir, filename);
    const client = url.startsWith('https') ? https : http;

    console.log(`Downloading ${url} ...`);
    client.get(url, res => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(`/uploads/services/${filename}`));
        });
      } else {
        console.error(`Failed to download ${url}: ${res.statusCode}`);
        resolve(url);
      }
    }).on('error', err => {
      console.error(`Download error for ${url}: ${err.message}`);
      resolve(url);
    });
  });
};

async function ensureTextureService() {
  for (const candidate of SERVICE_ID_CANDIDATES) {
    const [rows] = await pool.query('SELECT id, title, category_id FROM services WHERE id = ?', [candidate]);
    if (rows.length) {
      console.log(`✅ Using existing service "${rows[0].title}" (id: ${rows[0].id}, category: ${rows[0].category_id})`);
      return rows[0].id;
    }
    console.log(`ℹ️  Service id "${candidate}" not found, trying next candidate...`);
  }

  // No texture service exists — create the full chain:
  // Painters category → Wall Texture subcategory → texture service.
  console.log('ℹ️  No texture service found. Creating Painters → Wall Texture → texture service...');

  await pool.query(
    `INSERT INTO categories (id, title, subtitle, icon, tint)
     VALUES ('painters', 'Painters', 'Wall painting, polishing and texture works', 'format-paint', '#D97706')
     ON CONFLICT (id) DO NOTHING`,
  );

  await pool.query(
    `INSERT INTO subcategories (id, category_id, title, description)
     VALUES ('wall-texture-main', 'painters', 'Wall Texture', 'Designer wall texture finishes — choose a design, enter area, get instant total.')
     ON CONFLICT (id) DO NOTHING`,
  );

  const minRate = Math.min(...TEXTURE_DESIGNS.map(d => d.price));
  await pool.query(
    `INSERT INTO services
     (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, service_type, image_url, detail_description, details, includes, excludes)
     VALUES ('wall-texture-main', 'painters', 'wall-texture-main', 'Wall Texture',
             'Designer wall texture finishes — choose a design, enter area, get instant total.',
             ?, ?, '2-3 days', 4.8, 0, 'New', 'Per sq. ft.', '',
             'Designer wall texture finishes.', '[]', '[]', '[]')
     ON CONFLICT (id) DO NOTHING`,
    [minRate, Math.round(minRate * 1.2)],
  );

  console.log('✅ Created Painters category, Wall Texture subcategory and texture service.');
  return 'wall-texture-main';
}

async function seedTextureDesigns() {
  try {
    const serviceId = await ensureTextureService();

    console.log('\nSeeding texture sub-category designs...\n');
    for (const [index, design] of TEXTURE_DESIGNS.entries()) {
      const imageUrl = await downloadImage(design.imageFile, `texture-${index + 1}`);

      // Idempotent: if a design with the same title already exists for this
      // service, update its price/image instead of creating a duplicate.
      const [existing] = await pool.query(
        'SELECT id FROM service_work_prices WHERE service_id = ? AND title = ?',
        [serviceId, design.title],
      );

      if (existing.length) {
        await pool.query(
          `UPDATE service_work_prices
           SET description = ?, price = ?, image_url = ?, pricing_mode = 'per_sqft', sort_order = ?
           WHERE id = ?`,
          [design.description, design.price, imageUrl, index, existing[0].id],
        );
        console.log(`♻️  Updated design: ${design.title} → Rs ${design.price}/sq ft`);
      } else {
        await pool.query(
          `INSERT INTO service_work_prices
           (service_id, title, description, price, image_url, pricing_mode, sort_order)
           VALUES (?, ?, ?, ?, ?, 'per_sqft', ?)`,
          [serviceId, design.title, design.description, design.price, imageUrl, index],
        );
        console.log(`✅ Added design: ${design.title} → Rs ${design.price}/sq ft`);
      }
    }

    // Show the final state for this service.
    const [rows] = await pool.query(
      `SELECT title, price, pricing_mode FROM service_work_prices
       WHERE service_id = ? ORDER BY sort_order ASC`,
      [serviceId],
    );
    console.log(`\n📋 Designs now on service "${serviceId}":`);
    rows.forEach(row => {
      console.log(`   • ${row.title} — Rs ${Number(row.price)}/sq ft (${row.pricing_mode})`);
    });

    console.log('\n✅ Done! Open the Painters category in the app to see it.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

seedTextureDesigns();

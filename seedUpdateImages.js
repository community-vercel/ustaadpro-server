import pool from './config/db.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadImage = (url, prefix) => {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve(url);
    const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/);
    let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) ext = 'jpg';

    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const uploadsDir = path.join(__dirname, 'uploads', 'services');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filepath = path.join(uploadsDir, filename);
    const client = url.startsWith('https') ? https : http;

    console.log(`Downloading ${url} ...`);
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
    }).on('error', (err) => {
      console.error(`Download error for ${url}: ${err.message}`);
      resolve(url);
    });
  });
};

// Updated works — new direct image URLs provided by user
const updatedWorks = [
  // ── Electrician ──────────────────────────────────────────────────────────────
  { serviceId: 'electrician-main', title: 'Single Phase Breaker Replacement',           price: 800,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQh0_2rwTStrrbgcp8gYZvZor78HzxyLQkzHkp_pwikYQ&s=10' },
  { serviceId: 'electrician-main', title: 'Single Phase Distribution Box Installation', price: 2000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBixxgJFVPs9znltJlzHZM_yslIJJZKsaPM31_t07OVz8m9-_0VPyWTfr8&s=10' },
  { serviceId: 'electrician-main', title: 'Fan Installation',                           price: 600,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCVFlPKUsqxvlvteJxT8iNVu-yzQNnceEqiBCduNix2aefFZk66j2choc&s=10' },
  // Both spellings of the typo, just in case
  { serviceId: 'electrician-main', title: 'Ceilling Fan Repairing',                    price: 500,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjD8DHSz0SKqWsqZoHdALfEDxP2i5H8daiky5QkgNaAIj_XplZBrePm50&s=10' },
  { serviceId: 'electrician-main', title: 'Ceiling Fan Repairing',                     price: 500,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjD8DHSz0SKqWsqZoHdALfEDxP2i5H8daiky5QkgNaAIj_XplZBrePm50&s=10' },
  { serviceId: 'electrician-main', title: 'Ceiling Fan Installation',                  price: 700,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBPL8HQ0g-Sv-zTI_6OH3zytONgaPVeF3pEsOucHWDTY_2SnzTB0fZnEHW&s=10' },
  { serviceId: 'electrician-main', title: 'Switch Board Repair',                       price: 700,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-VEfExHd6sgmYTGx_xTzfNoES4CW66FzYp2mTS-N7wA&s=10' },
  { serviceId: 'electrician-main', title: 'Switch Installation',                       price: 500,  imageFile: 'https://electrexia.com/wp-content/uploads/2026/05/How_to_Install_a_Switch_202605141358.webp' },
  { serviceId: 'electrician-main', title: 'Change Over Switch Installation',           price: 1100, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQq7kBuN2xvtNE_qZRiZ2tJ-jEtDYHhdJzIZ-nTbLO0n-uRRaGlqpoERJY&s=10' },
  { serviceId: 'electrician-main', title: 'Socket Replacement',                        price: 500,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_bDxjuBmbpSlisOv9qRmsgdSrNs_Z7AHMbiTWfVJy5ZMqW5b-drjd9TI&s=10' },
  { serviceId: 'electrician-main', title: 'House Wiring',                              price: 2500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE-sXQ5EOBnZLp5N3knKO-KKzdfLOo8L3q1NGNS2J4GJrd9DDV4nzAAFM&s=10' },
  { serviceId: 'electrician-main', title: 'Rewiring',                                  price: 4000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0X9Ro6chf7Oob5RnnaLMBGCxMbS70okwQmHhxcanDDUjJ36saC_3PG6--&s=10' },
  { serviceId: 'electrician-main', title: 'Light Installation',                        price: 400,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrrW_-3rKBIwbNSoWpcuFyDClhXKNkjVXWIYWBC6KCorpc6ZM3d8Psi2s&s=10' },
  { serviceId: 'electrician-main', title: 'LED Light Installation',                    price: 500,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYF1z_irQE5ZmY6yB-yhq4mMtwCjaKAWqKnnOzjuy2Tg&s=10' },
  { serviceId: 'electrician-main', title: 'Chandelier Installation',                   price: 1500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlt-hqgXN8gwmwpWv-WcSAahpBvcPm8_nAOiPvqf6HlQ&s=10' },
  { serviceId: 'electrician-main', title: 'Outdoor Light Installation',                price: 800,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3Jt0B_tP43lAajklfN_3uhDCqZSPVWB3WdkdEl9ibrw&s=10' },
  { serviceId: 'electrician-main', title: 'Door Bell Installation',                    price: 600,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBFDJeoclrRdYuweIRsOQ5wbQOGlqbvAa1gXLospDTOg&s=10' },
  { serviceId: 'electrician-main', title: 'Exhaust Fan Installation',                  price: 700,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3U4Lo_ftSe7_2brUPDAv0OnI2uFaoLUVlJoIXsmZW1w&s=10' },
  { serviceId: 'electrician-main', title: 'DB Board Installation',                     price: 2500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtiqsD5mzaC7CqiGvaqvC_dZTtrQwh6qtfx-OwtJOU1Q&s=10' },
  { serviceId: 'electrician-main', title: 'DB Board Repair',                           price: 1000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtrtzkf_aw9gxNVid2xPg3vaosISH48afWFrb_qd9DGg&s=10' },
  { serviceId: 'electrician-main', title: 'Earthing Installation',                     price: 3000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUXH1ZKh5Ud4_psMAUxM7ghW1Eze_6qfx3ED-Zve-YdA&s=10' },
  { serviceId: 'electrician-main', title: 'Electrical Safety Inspection',              price: 1500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQA08EEXSbeSyidXL5fXqs78V4zdWcxcCliOnZN9PuDtQ&s=10' },
  { serviceId: 'electrician-main', title: 'Short Circuit Repair',                      price: 1000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHxw-pxEJCUEVxCrBSYkAX4Lmz5Rh2c2y7gEPgKNoojw&s=10' },
  { serviceId: 'electrician-main', title: 'Power Failure Troubleshooting',             price: 1200, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLwdhI8k3uYChgjlnF7wxrfRcPI368-V-C1-5FRBQq4A&s=10' },
  { serviceId: 'electrician-main', title: 'Inverter Installation',                     price: 2500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWUX1ejcB8yp0a9aaN-TPD0zp5wvh-3u17aDmvBGR0_-ezu4Ps7jbaA0Q&s=10' },
  { serviceId: 'electrician-main', title: 'UPS Installation',                          price: 2500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXJkgTFIMp4qhbxbNPdmSilkdRwobfxIA3lpylkw6Sex296lnLoH2uQqU&s=10' },
  { serviceId: 'electrician-main', title: 'Generator Wiring',                          price: 4000, imageFile: 'https://www.staticelectrics.com.au/wp-content/uploads/2024/04/how-to-connect-generator-to-house-1024x675.jpg' },
  { serviceId: 'electrician-main', title: 'TV Wall Mount Installation',                price: 1500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVjtramhAKHE21ECVeYp2pDBtLCZaxEpkSTJMsIGar1g&s=10' },
  { serviceId: 'electrician-main', title: 'LCD/LED TV Repair',                         price: 2500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2VHeBgRWW9YdlM-K16zMDgjpdunkXLHYht0JEkpWuDw&s=10' },
  { serviceId: 'electrician-main', title: 'Automatic Washing Machine Repairing',       price: 700,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkUDXMC9crganhNvmlKOfK20IutXEXsDl0rgxnnJIg3A&s' },

  // ── Home Services ─────────────────────────────────────────────────────────────
  { serviceId: 'home-cleaning-main', title: 'Sofa Cleaning - 5 Seater',  price: 1300, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7oFTNDuqP_Ca8ZsbMldeR1eHk_Q0e8l-FsHd7OgekdQ&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Sofa Cleaning - 6 Seater',  price: 1599, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWTfpDCZj2GGFXj9x4yECIq4ULWnquw8t9I3HJk14Aqg&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Sofa Cleaning - 7 Seater',  price: 1890, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8rnWXVJUWgG9RwrlNbz3vy9MzycWzJTPXwYmj9yQkXw&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Sofa Cleaning - 10 Seater', price: 2690, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTs579MQtPPvXsWdMLI3p5QgQg35eBOlnFWBnGt250WTw&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Sofa Cleaning - Per Seat',  price: 250,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHF_c9HTE9VLZn1V65BuGm67yxPVS51eEsnCxGiIYPBg&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Dewan Cleaning',            price: 1099, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqYUBlR8Xrj9fZdM2SCVFBu6rQg2pWnrla3s1TrthzVQ&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Sofa Cum Bed Cleaning',     price: 1350, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqCxAjB4-F_yOxKsqac10SpksKtrcoNj6FG-h-FFVg_g&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Water Tank Cleaning',       price: 2000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScXKcB0kfzhYIzD381HC3L3ag1C3zUCGkaTkX_A2Fe-Q&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Full Home Deep Cleaning',   price: 8000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEdyZ3ARrF1f55JGcSBy_TAyqbs2p0KO0JTCA78X6L-w&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Gardener Visit',            price: 1500, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvjG-FCatkaru0piidLynAkG4wYowofks0SUwHgnxmbg9exFiwtJ21c8k&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Blind Cleaning',            price: 800,  imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQolkhqg1AOMIPzbsItVcdKYGnF7eq8UMMvMVoPSNDfMA&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Carpet Cleaning',           price: 25,   imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjRQffW601tKiqwaDuvjGBRuXhf37wOvHXnny24s0UPw&s=10' },
  { serviceId: 'home-cleaning-main', title: 'Curtain Cleaning',          price: 1000, imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl1Ip6HxTSb7MiMHIPXXjma8DIwqD1OnMxUr1Z-T9Ftw&s=10' },
];

async function updateImages() {
  try {
    let updated = 0;
    let skipped = 0;

    for (const work of updatedWorks) {
      // Check if row exists
      const [rows] = await pool.query(
        `SELECT id FROM service_work_prices WHERE service_id = ? AND title = ?`,
        [work.serviceId, work.title]
      );

      if (rows.length === 0) {
        console.warn(`⚠️  Not found (skipping): [${work.serviceId}] "${work.title}"`);
        skipped++;
        continue;
      }

      const localImage = await downloadImage(work.imageFile, work.serviceId);

      await pool.query(
        `UPDATE service_work_prices SET image_url = ?, price = ? WHERE service_id = ? AND title = ?`,
        [localImage, work.price, work.serviceId, work.title]
      );

      console.log(`✅ Updated: "${work.title}" → ${localImage}`);
      updated++;
    }

    console.log(`\n✅ Done! Updated: ${updated}, Skipped (not found): ${skipped}`);
  } catch (err) {
    console.error('Update failed:', err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

updateImages();

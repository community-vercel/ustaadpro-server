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
    
    const filename = `${prefix}_${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, 'uploads', 'services');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    
    const filepath = path.join(uploadsDir, filename);
    const client = url.startsWith('https') ? https : http;
    
    console.log(`Downloading ${url} ...`);
    client.get(url, (res) => {
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

const newCategories = [
  { id: 'electrician', title: 'Electrician', subtitle: 'Electrical repairs and wiring', icon: 'lightning-bolt', tint: '#F59E0B' },
  { id: 'home-cleaning', title: 'Home Cleaning', subtitle: 'Deep cleaning and maintenance', icon: 'sparkles', tint: '#006C49' },
  { id: 'plumbers', title: 'Plumber', subtitle: 'Pipes, leaks and sanitary', icon: 'wrench', tint: '#0891B2' },
  { id: 'painters', title: 'Painters', subtitle: 'Wall painting, polishing and texture works', icon: 'format-paint', tint: '#D97706' },
  { id: 'carpenter', title: 'Carpenter', subtitle: 'Furniture, doors, locks and cabinets', icon: 'hammer', tint: '#92400E' },
  { id: 'welder-fabricator', title: 'Welder & Fabricator', subtitle: 'Gate, grill, glass and ceiling works', icon: 'anvil', tint: '#4B5563' },
  { id: 'cctv', title: 'CCTV Services', subtitle: 'Installation and maintenance of cameras', icon: 'cctv', tint: '#1E3A8A' },
  { id: 'ac-services', title: 'HVAC Services', subtitle: 'AC installation and repairs', icon: 'air-conditioner', tint: '#4F46E5' },
  { id: 'subscriptions', title: 'Office Maintenance', subtitle: 'Regular maintenance visits', icon: 'calendar', tint: '#DB2777' },
];

const mainServices = [
  { id: 'electrician-main', categoryId: 'electrician', title: 'Electrician Services', description: 'Professional electrical services and repairs.', imageFile: 'https://www.staticelectrics.com.au/wp-content/uploads/2024/04/how-to-connect-generator-to-house-1024x675.jpg' },
  { id: 'home-cleaning-main', categoryId: 'home-cleaning', title: 'Home Cleaning Services', description: 'Professional deep cleaning and sofa cleaning.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEdyZ3ARrF1f55JGcSBy_TAyqbs2p0KO0JTCA78X6L-w&s=10' },
  { id: 'plumbers-main', categoryId: 'plumbers', title: 'Plumber Services', description: 'Professional plumbing repairs and installation.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0CmktSAYF45gnWKaZIUkbGo00hfjEGwxMZv71kmY2PA&s=10' },
  { id: 'painters-main', categoryId: 'painters', title: 'Painter Services', description: 'Professional painting and polishing works.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS57x5xzMtLEZjRCQIIPPOq2TXpYm3hJrr_Ye2ws8u55Q&s=10' },
  { id: 'carpenter-main', categoryId: 'carpenter', title: 'Carpenter Services', description: 'Professional furniture and wood works.', imageFile: 'https://images.ctfassets.net/5kq8dse7hipf/7FhCe1WYFMZMo0SA9FR3Qi/595b0bedfdaa8dc30408ec280fc9d62f/Furniture-repair-cost.jpg' },
  { id: 'welder-fabricator-main', categoryId: 'welder-fabricator', title: 'Welder & Fabricator', description: 'Professional welding and fabrication works.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzlSr775plNRk8zhDGnWlSQnWxv90iHCmW4AIq4X38opWYN5FiHHrwPwZV&s=10' },
  { id: 'cctv-main', categoryId: 'cctv', title: 'CCTV Services', description: 'Professional CCTV installation and maintenance.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyW4HuwBp1GBmCe_Ai2yQS9pe7wDPqaiUJ3mTxAOKQ1cLJa8kwVR3Mh-sx&s=10' },
  { id: 'ac-services-main', categoryId: 'ac-services', title: 'HVAC Services', description: 'Professional AC installation and repairs.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBEz012fO0fV0vzAuopTF0lA25au4BRki3FkHLUBPuDw&s=10' },
  { id: 'subscriptions-main', categoryId: 'subscriptions', title: 'Office Maintenance', description: 'Professional office maintenance visits.', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCFr0hUyfJLfqiHua7okyXxX2CVCpPq_yCkgWW0BtrsA&s=10' },
];

const newSpecificWorks = [
  // Electrician
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQh0_2rwTStrrbgcp8gYZvZor78HzxyLQkzHkp_pwikYQ&s=10', title: 'Single Phase Breaker Replacement', description: 'Professional breaker replacement service.', price: 800, originalPrice: 960 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBixxgJFVPs9znltJlzHZM_yslIJJZKsaPM31_t07OVz8m9-_0VPyWTfr8&s=10', title: 'Single Phase Distribution Box Installation', description: 'Professional distribution box installation.', price: 2000, originalPrice: 2400 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCVFlPKUsqxvlvteJxT8iNVu-yzQNnceEqiBCduNix2aefFZk66j2choc&s=10', title: 'Fan Installation', description: 'Ceiling fan installation service.', price: 600, originalPrice: 720 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjD8DHSz0SKqWsqZoHdALfEDxP2i5H8daiky5QkgNaAIj_XplZBrePm50&s=10', title: 'Ceiling Fan Repairing', description: 'Ceiling fan repair service.', price: 500, originalPrice: 600 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBPL8HQ0g-Sv-zTI_6OH3zytONgaPVeF3pEsOucHWDTY_2SnzTB0fZnEHW&s=10', title: 'Ceiling Fan Installation', description: 'Ceiling fan installation service.', price: 700, originalPrice: 840 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-VEfExHd6sgmYTGx_xTzfNoES4CW66FzYp2mTS-N7wA&s=10', title: 'Switch Board Repair', description: 'Switch board repair service.', price: 700, originalPrice: 840 },
  { serviceId: 'electrician-main', imageFile: 'https://electrexia.com/wp-content/uploads/2026/05/How_to_Install_a_Switch_202605141358.webp', title: 'Switch Installation', description: 'Switch installation service.', price: 500, originalPrice: 600 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQq7kBuN2xvtNE_qZRiZ2tJ-jEtDYHhdJzIZ-nTbLO0n-uRRaGlqpoERJY&s=10', title: 'Change Over Switch Installation', description: 'Change over switch installation.', price: 1100, originalPrice: 1320 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_bDxjuBmbpSlisOv9qRmsgdSrNs_Z7AHMbiTWfVJy5ZMqW5b-drjd9TI&s=10', title: 'Socket Replacement', description: 'Socket replacement service.', price: 500, originalPrice: 600 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE-sXQ5EOBnZLp5N3knKO-KKzdfLOo8L3q1NGNS2J4GJrd9DDV4nzAAFM&s=10', title: 'House Wiring', description: 'Complete house wiring service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0X9Ro6chf7Oob5RnnaLMBGCxMbS70okwQmHhxcanDDUjJ36saC_3PG6--&s=10', title: 'Rewiring', description: 'Complete rewiring service.', price: 4000, originalPrice: 4800 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrrW_-3rKBIwbNSoWpcuFyDClhXKNkjVXWIYWBC6KCorpc6ZM3d8Psi2s&s=10', title: 'Light Installation', description: 'Light fixture installation service.', price: 400, originalPrice: 480 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYF1z_irQE5ZmY6yB-yhq4mMtwCjaKAWqKnnOzjuy2Tg&s=10', title: 'LED Light Installation', description: 'LED light installation service.', price: 500, originalPrice: 600 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlt-hqgXN8gwmwpWv-WcSAahpBvcPm8_nAOiPvqf6HlQ&s=10', title: 'Chandelier Installation', description: 'Chandelier installation service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3Jt0B_tP43lAajklfN_3uhDCqZSPVWB3WdkdEl9ibrw&s=10', title: 'Outdoor Light Installation', description: 'Outdoor light installation service.', price: 800, originalPrice: 960 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBFDJeoclrRdYuweIRsOQ5wbQOGlqbvAa1gXLospDTOg&s=10', title: 'Door Bell Installation', description: 'Door bell installation service.', price: 600, originalPrice: 720 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3U4Lo_ftSe7_2brUPDAv0OnI2uFaoLUVlJoIXsmZW1w&s=10', title: 'Exhaust Fan Installation', description: 'Exhaust fan installation service.', price: 700, originalPrice: 840 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtiqsD5mzaC7CqiGvaqvC_dZTtrQwh6qtfx-OwtJOU1Q&s=10', title: 'DB Board Installation', description: 'DB board installation service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtrtzkf_aw9gxNVid2xPg3vaosISH48afWFrb_qd9DGg&s=10', title: 'DB Board Repair', description: 'DB board repair service.', price: 1000, originalPrice: 1200 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUXH1ZKh5Ud4_psMAUxM7ghW1Eze_6qfx3ED-Zve-YdA&s=10', title: 'Earthing Installation', description: 'Earthing installation service.', price: 3000, originalPrice: 3600 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQA08EEXSbeSyidXL5fXqs78V4zdWcxcCliOnZN9PuDtQ&s=10', title: 'Electrical Safety Inspection', description: 'Electrical safety inspection service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHxw-pxEJCUEVxCrBSYkAX4Lmz5Rh2c2y7gEPgKNoojw&s=10', title: 'Short Circuit Repair', description: 'Short circuit repair service.', price: 1000, originalPrice: 1200 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLwdhI8k3uYChgjlnF7wxrfRcPI368-V-C1-5FRBQq4A&s=10', title: 'Power Failure Troubleshooting', description: 'Power failure troubleshooting service.', price: 1200, originalPrice: 1440 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWUX1ejcB8yp0a9aaN-TPD0zp5wvh-3u17aDmvBGR0_-ezu4Ps7jbaA0Q&s=10', title: 'Inverter Installation', description: 'Inverter installation service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXJkgTFIMp4qhbxbNPdmSilkdRwobfxIA3lpylkw6Sex296lnLoH2uQqU&s=10', title: 'UPS Installation', description: 'UPS installation service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'electrician-main', imageFile: 'https://www.staticelectrics.com.au/wp-content/uploads/2024/04/how-to-connect-generator-to-house-1024x675.jpg', title: 'Generator Wiring', description: 'Generator wiring service.', price: 4000, originalPrice: 4800 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVjtramhAKHE21ECVeYp2pDBtLCZaxEpkSTJMsIGar1g&s=10', title: 'TV Wall Mount Installation', description: 'TV wall mount installation service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2VHeBgRWW9YdlM-K16zMDgjpdunkXLHYht0JEkpWuDw&s=10', title: 'LCD/LED TV Repair', description: 'LCD/LED TV repair service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'electrician-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkUDXMC9crganhNvmlKOfK20IutXEXsDl0rgxnnJIg3A&s', title: 'Automatic Washing Machine Repairing', description: 'Washing machine repair service.', price: 700, originalPrice: 840 },
  // Home Services
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7oFTNDuqP_Ca8ZsbMldeR1eHk_Q0e8l-FsHd7OgekdQ&s=10', title: 'Sofa Cleaning - 5 Seater', description: 'Sofa cleaning service for 5-seater.', price: 1300, originalPrice: 1560 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWTfpDCZj2GGFXj9x4yECIq4ULWnquw8t9I3HJk14Aqg&s=10', title: 'Sofa Cleaning - 6 Seater', description: 'Sofa cleaning service for 6-seater.', price: 1599, originalPrice: 1919 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8rnWXVJUWgG9RwrlNbz3vy9MzycWzJTPXwYmj9yQkXw&s=10', title: 'Sofa Cleaning - 7 Seater', description: 'Sofa cleaning service for 7-seater.', price: 1890, originalPrice: 2268 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTs579MQtPPvXsWdMLI3p5QgQg35eBOlnFWBnGt250WTw&s=10', title: 'Sofa Cleaning - 10 Seater', description: 'Sofa cleaning service for 10-seater.', price: 2690, originalPrice: 3228 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHF_c9HTE9VLZn1V65BuGm67yxPVS51eEsnCxGiIYPBg&s=10', title: 'Sofa Cleaning - Per Seat', description: 'Sofa cleaning per seat (min 4).', price: 250, originalPrice: 300 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqYUBlR8Xrj9fZdM2SCVFBu6rQg2pWnrla3s1TrthzVQ&s=10', title: 'Dewan Cleaning', description: 'Dewan cleaning service.', price: 1099, originalPrice: 1319 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqCxAjB4-F_yOxKsqac10SpksKtrcoNj6FG-h-FFVg_g&s=10', title: 'Sofa Cum Bed Cleaning', description: 'Sofa cum bed cleaning service.', price: 1350, originalPrice: 1620 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScXKcB0kfzhYIzD381HC3L3ag1C3zUCGkaTkX_A2Fe-Q&s=10', title: 'Water Tank Cleaning', description: 'Water tank cleaning service.', price: 2000, originalPrice: 2400 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEdyZ3ARrF1f55JGcSBy_TAyqbs2p0KO0JTCA78X6L-w&s=10', title: 'Full Home Deep Cleaning', description: 'Full home deep cleaning service.', price: 8000, originalPrice: 9600 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvjG-FCatkaru0piidLynAkG4wYowofks0SUwHgnxmbg9exFiwtJ21c8k&s=10', title: 'Gardener Visit', description: 'Gardener visit service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQolkhqg1AOMIPzbsItVcdKYGnF7eq8UMMvMVoPSNDfMA&s=10', title: 'Blind Cleaning', description: 'Blind cleaning service.', price: 800, originalPrice: 960 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjRQffW601tKiqwaDuvjGBRuXhf37wOvHXnny24s0UPw&s=10', title: 'Carpet Cleaning', description: 'Carpet cleaning per sq ft.', price: 25, originalPrice: 30 },
  { serviceId: 'home-cleaning-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRl1Ip6HxTSb7MiMHIPXXjma8DIwqD1OnMxUr1Z-T9Ftw&s=10', title: 'Curtain Cleaning', description: 'Curtain cleaning service.', price: 1000, originalPrice: 1200 },
  // Plumber
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0CmktSAYF45gnWKaZIUkbGo00hfjEGwxMZv71kmY2PA&s=10', title: 'Plumbing Repair Visit', description: 'Plumbing repair visit service.', price: 700, originalPrice: 840 },
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnnmkrBeOrkBg8EAKq5YkJ8MRLBoR48AkfTnSeN5gq2w&s=10', title: 'Geyser Water Heater Repair', description: 'Geyser water heater repair service.', price: 1000, originalPrice: 1200 },
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPBlBgdru883X2LKSKuEMXMVtMElXPwRry_2RuogX2UQ&s=10', title: 'Motor Installation', description: 'Motor installation service.', price: 1200, originalPrice: 1440 },
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGUCufEqckOKfuTchPEN-bvL9SAClQKnk7uh3198dEWPIxUCBUI2bqTX4&s=10', title: 'Pipe Fitting', description: 'Pipe fitting service per running foot.', price: 150, originalPrice: 180 },
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRy5CkZqdZfI65oq0aJZhKyX3jnvYmceOoboDlFBHnNxxbR_mjF-cg-aHw&s=10', title: 'Drainage Cleaning', description: 'Drainage cleaning service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-LKHQRwZuZ2S5eiJfEroVKrVfZh8McHpbliA3mAlS7kSgJk5f00KPN4HN&s=10', title: 'Sanitary Fitting', description: 'Sanitary fitting service.', price: 800, originalPrice: 960 },
  { serviceId: 'plumbers-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2RzAvKs-i5okn991gak8lclDtPI4GrZpdFW7_wmzSfXudbXihM0lZXRc&s=10', title: 'Leakage Repair', description: 'Leakage repair service.', price: 800, originalPrice: 960 },
  // Painter
  { serviceId: 'painters-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS57x5xzMtLEZjRCQIIPPOq2TXpYm3hJrr_Ye2ws8u55Q&s=10', title: 'Interior Wall Painting', description: 'Interior wall painting service.', price: 500, originalPrice: 600 },
  { serviceId: 'painters-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKTO9be5F5wjiaPrnOwqtNV0lSMsUBXlqSAMy_VrUO4FnPBBsC2WK0iAo&s=10', title: 'Exterior Wall Painting', description: 'Exterior wall painting service.', price: 500, originalPrice: 600 },
  { serviceId: 'painters-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTX2MJLnrB86REo8FGdzvIxYcXsgeONU-hWqzHtPafcs_8TYmY6OcDoT0u-&s=10', title: 'Texture Painting', description: 'Texture painting per sq ft.', price: 75, originalPrice: 90 },
  { serviceId: 'painters-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTIb8R1UKRFAQtsP0IiDFc8C6apoSmDzS9j-Pjol1Gdpc6dsz5zMphRIix&s=10', title: 'Wood Polishing', description: 'Wood polishing per sq ft.', price: 110, originalPrice: 132 },
  { serviceId: 'painters-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb4GWgI0nHC51CjHGNPNRiOvzmfbuvW9PHa7GHckQpTEVznX1tBR6WYpZh&s=10', title: 'Wall Putty Works', description: 'Wall putty works per sq ft.', price: 22, originalPrice: 26 },
  { serviceId: 'painters-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-1PIrYbcX8xxNoxaj0UWtDoYwRdBJWKUgGUiRh3ccnkTBjWnwCVCdTFuW&s=10', title: 'Waterproofing', description: 'Waterproofing per sq ft.', price: 70, originalPrice: 84 },
  { serviceId: 'painters-main', imageFile: 'https://cdn.mrmahir.com/uploads/21534635-fe5a-4315-8c83-9d97a4ed0fbe.png', title: 'Gray Structure Paint', description: 'Gray structure paint service.', price: 500, originalPrice: 600 },
  // Carpenter
  { serviceId: 'carpenter-main', imageFile: 'https://images.ctfassets.net/5kq8dse7hipf/7FhCe1WYFMZMo0SA9FR3Qi/595b0bedfdaa8dc30408ec280fc9d62f/Furniture-repair-cost.jpg', title: 'Furniture Repair', description: 'Furniture repair service.', price: 1000, originalPrice: 1200 },
  { serviceId: 'carpenter-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHX3H16SzIN2qh_gT6zvj8l8yUKS7SdlQYSOItM_cCFSdh_3Opm10Z4zQ&s=10', title: 'Door Installation', description: 'Door installation service.', price: 2000, originalPrice: 2400 },
  { serviceId: 'carpenter-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQycww0hFJ-nSrKxkkJTnb_8ESbPH-Q4d742oK8djHJhmf33PZXLf7sXk&s=10', title: 'Window Installation', description: 'Window installation service.', price: 1800, originalPrice: 2160 },
  { serviceId: 'carpenter-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsq_7f7BWPMJo5dlUTGG-6FBf5u10VxPfqR2RswclLmA&s=10', title: 'Cabinet Making', description: 'Cabinet making per sq ft.', price: 500, originalPrice: 600 },
  { serviceId: 'carpenter-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRssDmOF6gBIo3ZT3L5ETUUlHOM_9w--oCoQrBh_YJ4IDwc_u4G1lsdB7mo&s=10', title: 'Wardrobe Making', description: 'Wardrobe making per sq ft.', price: 700, originalPrice: 840 },
  { serviceId: 'carpenter-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvzp4tbXiVWCVRbrgjZRnWXOmP_V1aEJcHnLtiuMNz_A&s=10', title: 'Lock Installation', description: 'Lock installation service.', price: 600, originalPrice: 720 },
  // Welder / Fabricator
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScrOQ8nmtO3ycvjALTvcIoc9sQ3I91vpwC02mvQq5mnlN0gzidTlSjlHI&s=10', title: 'Gate Repair', description: 'Gate repair service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzlSr775plNRk8zhDGnWlSQnWxv90iHCmW4AIq4X38opWYN5FiHHrwPwZV&s=10', title: 'Window Grill Making', description: 'Window grill making per sq ft.', price: 450, originalPrice: 540 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://i.pinimg.com/736x/33/c7/cb/33c7cb4c2e6e48fca61fef6cea9ee2e3.jpg', title: 'Stair Welding', description: 'Stair welding service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOajK_QOPHwfRdpsvXtbbziFayAGSpssfaFBquekcURg&s=10', title: 'Iron Fence Installation', description: 'Iron fence installation per running foot.', price: 500, originalPrice: 600 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOlFHqnU-YTJo-LNTJxmAPKmlNS2RdSGoXmkzfV5rALolBZ27EeeFsoaez&s=10', title: 'Steel Fabrication', description: 'Steel fabrication per kg.', price: 450, originalPrice: 540 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTz9yWUS-wk4IcVvCgIxoYDXTmKwj2v0apPFrKy7wi7fA&s=10', title: 'Aluminium Window', description: 'Aluminium window per sq ft.', price: 900, originalPrice: 1080 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9hTkaL3H4FzdyIPtBBjYuXx_vv6W93Y04WWnPkv06nM1VE34tAqG8u6V1&s=10', title: 'Steel Gate', description: 'Steel gate per sq ft.', price: 650, originalPrice: 780 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd1_svwwHYMDYrreH9U_xEwmrxHHjrwt8Ufr7THtGQZw&s=10', title: 'Glass Work', description: 'Glass work per sq ft.', price: 450, originalPrice: 540 },
  { serviceId: 'welder-fabricator-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSIU670xlfk0Jt8eg3aB9-MbEKnU_MYKx9Nu5pa7u0Hg&s=10', title: 'Ceiling Works', description: 'Ceiling works per sq ft.', price: 150, originalPrice: 180 },
  // CCTV
  { serviceId: 'cctv-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyW4HuwBp1GBmCe_Ai2yQS9pe7wDPqaiUJ3mTxAOKQ1cLJa8kwVR3Mh-sx&s=10', title: 'Home CCTV Installation', description: 'Home CCTV installation per camera.', price: 1200, originalPrice: 1440 },
  { serviceId: 'cctv-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTClW3mqa5JLg1sQ6s6EFQ3ba434N7AfZYydqsxxcN_bw&s=10', title: 'Wireless CCTV Setup', description: 'Wireless CCTV setup service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'cctv-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtenrYQMRPe3aj2Pn5IVpsZtUasyvZ_ZGJ6iWRS-d6Jg&s=10', title: 'CCTV Maintenance', description: 'CCTV maintenance service.', price: 1000, originalPrice: 1200 },
  // HVAC / AC Services
  { serviceId: 'ac-services-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBEz012fO0fV0vzAuopTF0lA25au4BRki3FkHLUBPuDw&s=10', title: 'AC Installation', description: 'AC installation service.', price: 3000, originalPrice: 3600 },
  { serviceId: 'ac-services-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ00pTizU02YuJKdf9ASZm-EGEqamJjoK7AUHmmo_BU5A&s=10', title: 'AC Gas Pressure Check', description: 'AC gas pressure check service.', price: 800, originalPrice: 960 },
  { serviceId: 'ac-services-main', imageFile: 'https://s3.ap-south-1.amazonaws.com/cdn.sajilosewa.com/uploads/service/686bb1e10b6acba32fc9253a.webp', title: 'AC Dismounting', description: 'AC dismounting service.', price: 2000, originalPrice: 2400 },
  { serviceId: 'ac-services-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1hloiY6mQdYK8YdgfHWDfR4c_a6WPGLmLNs7NSY_2lQ&s=10', title: 'AC Gas Refill', description: 'AC gas refill service.', price: 4500, originalPrice: 5400 },
  { serviceId: 'ac-services-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSaHlMrfftBXNl1lh5aNTVjDGgTTYAiBbH99yQtukOhA&s=10', title: 'AC General Service', description: 'AC general service.', price: 2000, originalPrice: 2400 },
  // Office Maintenance
  { serviceId: 'subscriptions-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCFr0hUyfJLfqiHua7okyXxX2CVCpPq_yCkgWW0BtrsA&s=10', title: 'Facility Walkthrough', description: 'Facility walkthrough service.', price: 2500, originalPrice: 3000 },
  { serviceId: 'subscriptions-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsJk1YQDWRXUPkgsrY7f6pV0sVMEHEPa5PnXp3okzvmw&s=10', title: 'Basic Electrical Inspection', description: 'Basic electrical inspection service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'subscriptions-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOKFkzsvRalG5WqeO9yJtPBHoI6V1msd4ce3z0sPU5Cg&s=10', title: 'Plumbing Inspection', description: 'Plumbing inspection service.', price: 1500, originalPrice: 1800 },
  { serviceId: 'subscriptions-main', imageFile: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVUsG9th9iJ6be0umQUdaf3begbpAn8Z7cy009B5GsIA&s=10', title: 'HVAC Inspection', description: 'HVAC inspection service.', price: 2000, originalPrice: 2400 },
];

async function seedNewServices() {
  try {
    console.log('Clearing old data completely...');
    await pool.query('DELETE FROM service_work_prices');
    await pool.query('DELETE FROM services');
    await pool.query('DELETE FROM subcategories');
    // Categories are kept or updated to avoid breaking foreign keys from other tables (like order_items)

    console.log('Seeding new categories...');
    for (const cat of newCategories) {
      await pool.query(`
        INSERT INTO categories (id, title, subtitle, icon, tint)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, icon = EXCLUDED.icon, tint = EXCLUDED.tint
      `, [cat.id, cat.title, cat.subtitle, cat.icon, cat.tint]);
    }
    console.log(`✅ Seeded ${newCategories.length} new categories`);

    console.log('Seeding subcategories (dummy for constraint)...');
    for (const svc of mainServices) {
      await pool.query(`
        INSERT INTO subcategories (id, category_id, title, description)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
      `, [svc.id, svc.categoryId, svc.title, svc.description]);
    }

    console.log('Seeding main services (what you see on category screen)...');
    for (const svc of mainServices) {
      // Find lowest price from specific works
      const specificWorks = newSpecificWorks.filter(w => w.serviceId === svc.id);
      const minPrice = specificWorks.length > 0 ? Math.min(...specificWorks.map(w => w.price)) : 500;
      
      const localImage = await downloadImage(svc.imageFile, svc.id);
      
      await pool.query(`
        INSERT INTO services (id, category_id, subcategory_id, title, description, image_url, price, original_price, duration, rating, reviews, badge, service_type, detail_description, details, includes, excludes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '45-90 min', 4.8, 120, 'New', 'Standard Service', ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = EXCLUDED.price, image_url = EXCLUDED.image_url
      `, [
        svc.id, svc.categoryId, svc.id, svc.title, svc.description,
        localImage, minPrice, Math.round(minPrice * 1.2),
        svc.description,
        JSON.stringify(['Technician visits the site', 'Inspects requirements', 'Provides service']),
        JSON.stringify([svc.title, 'Site inspection', 'Standard tools usage']),
        JSON.stringify(['Major spare parts', 'Extra civil work']),
      ]);
    }
    console.log(`✅ Seeded ${mainServices.length} main services`);

    console.log('Seeding specific works...');
    let workCounter = 0;
    for (const work of newSpecificWorks) {
      const localImage = await downloadImage(work.imageFile, work.serviceId);
      await pool.query(`
        INSERT INTO service_work_prices (service_id, title, description, price, image_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [work.serviceId, work.title, work.description, work.price, localImage, workCounter]);
      workCounter++;
    }
    console.log(`✅ Seeded ${newSpecificWorks.length} specific works`);

    console.log('\n✅ All done!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

seedNewServices();

import {copyFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pool from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImageDir = path.join(__dirname, 'seedappContent');
const publicImageDir = path.join(__dirname, 'uploads', 'seedappContent');
const publicImageBase = '/uploads/seedappContent';

const categories = [
  {
    id: 'home',
    title: 'Home Services',
    subtitle: 'AC, plumbing, geyser and repair work',
    icon: 'tools',
    tint: '#006C49',
  },
  {
    id: 'cleaning',
    title: 'Cleaning',
    subtitle: 'Deep cleaning, sofa, carpet and water tank care',
    icon: 'sparkle',
    tint: '#0B1C30',
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    subtitle: 'Monthly home and office maintenance plans',
    icon: 'calendar',
    tint: '#213145',
  },
];

const subcategories = [
  {
    id: 'ac-services',
    categoryId: 'home',
    title: 'AC Services',
    description: 'AC service, installation, dismounting and gas refill',
  },
  {
    id: 'plumbing-services',
    categoryId: 'home',
    title: 'Plumbing Services',
    description: 'Leakage, taps, geyser and pipe repair visits',
  },
  {
    id: 'home-cleaning',
    categoryId: 'cleaning',
    title: 'Home Cleaning',
    description: 'Full home and water tank cleaning',
  },
  {
    id: 'sofa-carpet-cleaning',
    categoryId: 'cleaning',
    title: 'Sofa & Carpet Care',
    description: 'Sofa shampoo and carpet cleaning',
  },
  {
    id: 'commercial',
    categoryId: 'subscriptions',
    title: 'Commercial Care',
    description: 'Office and business maintenance visits',
  },
];

const services = [
  {
    id: 'ac-general-service',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    imageFile: 'ac_general_service.webp',
    publicFile: 'ac-general-service.webp',
    title: 'AC General Service',
    description:
      'Complete split AC indoor and outdoor service for better cooling and cleaner airflow.',
    detailDescription:
      'Our technician checks cooling, washes filters, cleans key AC areas, and shares any repair advice before extra work.',
    price: 2499,
    originalPrice: 3200,
    duration: '60-75 min',
    rating: 4.86,
    reviews: 1240,
    badge: 'Most booked',
    serviceType: 'AC Service',
    includes: [
      'Filter wash',
      'Indoor unit cleaning',
      'Outdoor unit inspection',
      'Drain tray cleaning',
      'Cooling performance check',
    ],
    details: [
      'Indoor filters washed and refitted',
      'Cooling and air throw checked',
      'Drain water flow inspected',
      'Outdoor unit visually inspected',
      'Final service report shared',
    ],
    excludes: [
      'Gas refilling',
      'Parts replacement',
      'Compressor repair',
      'Copper pipe replacement',
      'Wall breaking or concealed work',
    ],
  },
  {
    id: 'ac-installation',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    imageFile: 'ac-installation-services.jpg',
    publicFile: 'ac-installation.jpg',
    title: 'AC Installation',
    description:
      'Professional split AC installation with indoor and outdoor unit fitting.',
    detailDescription:
      'Includes proper unit placement, mounting, pipe connection, and a final cooling test after installation.',
    price: 7999,
    originalPrice: 9500,
    duration: '2-3 hrs',
    rating: 4.78,
    reviews: 840,
    badge: 'Expert setup',
    serviceType: 'Installation',
    includes: [
      'Indoor unit mounting',
      'Outdoor unit placement',
      'Copper pipe fitting up to 10 ft',
      'Drain pipe connection',
      'Cooling test',
    ],
    details: [
      'Wall position checked before mounting',
      'Indoor and outdoor units aligned',
      'Pipe and drain connections secured',
      'Electrical connection checked',
      'Cooling performance tested before handover',
    ],
    excludes: [
      'Copper pipe beyond 10 ft',
      'Outdoor bracket fabrication',
      'Electrical rewiring',
      'Wall cutting or civil work',
      'Gas charging if unit is empty',
    ],
  },
  {
    id: 'ac-dismounting',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    imageFile: 'ac_dismounting.webp',
    publicFile: 'ac-dismounting.webp',
    title: 'AC Dismounting',
    description:
      'Safe split AC dismounting with gas lock check and careful unit removal.',
    detailDescription:
      'Best for shifting homes or replacing an old AC. The technician removes both units and wraps pipes safely.',
    price: 1999,
    originalPrice: 2500,
    duration: '45-60 min',
    rating: 4.8,
    reviews: 320,
    badge: 'Shifting help',
    serviceType: 'Dismounting',
    includes: [
      'Outdoor unit dismounting',
      'Indoor unit removal',
      'Gas lock check',
      'Pipe wrapping',
    ],
    details: [
      'Gas locking attempted before removal',
      'Indoor unit removed from wall plate',
      'Outdoor unit disconnected carefully',
      'Copper pipe and drain pipe wrapped',
      'Removed units kept ready for transport',
    ],
    excludes: [
      'Transport to new location',
      'New installation at another address',
      'Wall hole plastering or sealing',
      'Outdoor bracket removal from unsafe locations',
      'Repair of damaged pipes or wires',
    ],
  },
  {
    id: 'ac-gas-refill',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    imageFile: 'ac_gas_refill.webp',
    publicFile: 'ac-gas-refill.webp',
    title: 'AC Gas Refill',
    description:
      'AC gas top-up with pressure check and basic leak inspection for weak cooling.',
    detailDescription:
      'The technician checks pressure, looks for visible leakage signs, and fills suitable gas after confirmation.',
    price: 4500,
    originalPrice: 5500,
    duration: '60 min',
    rating: 4.85,
    reviews: 410,
    badge: 'Summer Special',
    serviceType: 'Gas Refill',
    includes: [
      'Gas pressure check',
      'Basic leakage inspection',
      'R-22 / R-410A top-up',
      'Cooling test',
    ],
    details: [
      'Current gas pressure checked with gauge',
      'Visible joints inspected for leakage',
      'Gas filled as per AC requirement',
      'Cooling checked after refill',
      'Technician advises if major leak repair is needed',
    ],
    excludes: [
      'Major leak repair',
      'Copper pipe replacement',
      'Compressor repair',
      'Full AC service wash',
      'Parts and valve replacement',
    ],
  },
  {
    id: 'plumbing-visit',
    categoryId: 'home',
    subcategoryId: 'plumbing-services',
    imageFile: 'plumbing_repair.webp',
    publicFile: 'plumbing-repair.webp',
    title: 'Plumbing Repair Visit',
    description:
      'Home plumbing visit for leakage, tap, drain, flush and fixture issues.',
    detailDescription:
      'A plumber inspects the issue, performs minor fixes where possible, and shares a clear estimate for bigger work.',
    price: 999,
    originalPrice: 1400,
    duration: '45 min',
    rating: 4.72,
    reviews: 610,
    badge: 'Quick visit',
    serviceType: 'Repair Visit',
    includes: [
      'Leak inspection',
      'Tap repair check',
      'Drain blockage diagnosis',
      'Minor fitting adjustment',
      'Repair estimate',
    ],
    details: [
      'Leakage source inspected',
      'Tap and fixture condition checked',
      'Drain flow tested where accessible',
      'Minor tightening or adjustment included',
      'Material requirement explained before extra work',
    ],
    excludes: [
      'Sanitary fittings cost',
      'Major pipeline work',
      'Tile breaking or replacement',
      'Water motor repair',
      'Concealed pipe leakage repair',
    ],
  },
  {
    id: 'geyser-repair',
    categoryId: 'home',
    subcategoryId: 'plumbing-services',
    imageFile: 'geyser water heater repair.webp',
    publicFile: 'geyser-water-heater-repair.webp',
    title: 'Geyser / Water Heater Repair',
    description:
      'Geyser and water heater inspection for heating, leakage, thermostat and element issues.',
    detailDescription:
      'The technician checks the geyser safely, identifies the fault, and performs minor repair if no new parts are required.',
    price: 1500,
    originalPrice: 2000,
    duration: '60 min',
    rating: 4.65,
    reviews: 180,
    badge: 'Winter ready',
    serviceType: 'Geyser Repair',
    includes: [
      'Thermostat check',
      'Heating element test',
      'Minor leak inspection',
      'Water connection check',
      'Repair estimate',
    ],
    details: [
      'Power and safety condition checked',
      'Thermostat and element inspected',
      'Visible leakage points checked',
      'Water inlet and outlet checked',
      'Parts requirement shared before replacement',
    ],
    excludes: [
      'New parts cost',
      'Geyser replacement',
      'Major wiring updates',
      'Gas line work',
      'Wall or tile repair',
    ],
  },
  {
    id: 'deep-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'home-cleaning',
    imageFile: 'full_home_deep_cleaning.webp',
    publicFile: 'full-home-deep-cleaning.webp',
    title: 'Full Home Deep Cleaning',
    description:
      'Machine-assisted deep cleaning for rooms, lounge, kitchen and bathrooms.',
    detailDescription:
      'A trained cleaning team cleans high-touch areas, floors, bathrooms, kitchen surfaces and visible dust buildup.',
    price: 14999,
    originalPrice: 18000,
    duration: '5-7 hrs',
    rating: 4.91,
    reviews: 430,
    badge: 'Premium',
    serviceType: 'Deep Cleaning',
    includes: [
      'Kitchen degreasing',
      'Bathroom descaling',
      'Floor machine scrub',
      'Dusting and wiping',
      'Garbage collection',
    ],
    details: [
      'Bedrooms, lounge and common areas cleaned',
      'Kitchen counters and outer cabinets wiped',
      'Bathroom tiles and fittings descaled',
      'Floors scrubbed and mopped',
      'Final walkthrough completed',
    ],
    excludes: [
      'Pest control',
      'Exterior windows',
      'Furniture shifting beyond 25 kg',
      'Paint or wall stain removal',
      'Post-construction debris removal',
    ],
  },
  {
    id: 'water-tank-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'home-cleaning',
    imageFile: 'water-tank-cleaning.jpg',
    publicFile: 'water-tank-cleaning.jpg',
    title: 'Water Tank Cleaning',
    description:
      'Underground and overhead water tank cleaning with sludge removal and wash.',
    detailDescription:
      'The team removes sludge, washes the tank interior, and applies anti-bacterial spray where suitable.',
    price: 2500,
    originalPrice: 3500,
    duration: '90-120 min',
    rating: 4.88,
    reviews: 215,
    badge: 'Essential',
    serviceType: 'Tank Cleaning',
    includes: [
      'Sludge removal',
      'High-pressure wash',
      'Tank wall scrubbing',
      'Anti-bacterial spray',
      'Final rinse',
    ],
    details: [
      'Tank emptied before cleaning where possible',
      'Sludge and dirt removed manually',
      'Interior walls scrubbed',
      'Tank rinsed after cleaning',
      'Hygiene spray applied if available',
    ],
    excludes: [
      'Tank crack repair',
      'Plumbing fixes',
      'Water pump repair',
      'Water disposal outside normal access',
      'Cleaning unsafe or inaccessible tanks',
    ],
  },
  {
    id: 'sofa-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'sofa-carpet-cleaning',
    imageFile: 'sopha_shampoo_cleaning.jpg',
    publicFile: 'sofa-shampoo-cleaning.jpg',
    title: 'Sofa Shampoo Cleaning',
    description:
      'Fabric-safe shampoo and wet vacuum cleaning for sofa sets and cushions.',
    detailDescription:
      'The cleaner extracts dust, applies fabric shampoo, brushes the sofa and removes moisture with wet vacuum.',
    price: 3499,
    originalPrice: 4500,
    duration: '90 min',
    rating: 4.8,
    reviews: 522,
    badge: 'Fresh look',
    serviceType: 'Sofa Cleaning',
    includes: [
      'Dust extraction',
      'Fabric shampoo',
      'Soft brushing',
      'Wet vacuum drying',
      'Basic deodorizing',
    ],
    details: [
      'Loose dust removed first',
      'Shampoo applied as per fabric condition',
      'Seats and back cushions brushed',
      'Wet vacuum used for moisture extraction',
      'Drying guidance shared after service',
    ],
    excludes: [
      'Leather polishing',
      'Permanent stain removal',
      'Cushion repair',
      'Sofa frame repair',
      'Mold treatment',
    ],
  },
  {
    id: 'carpet-dry-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'sofa-carpet-cleaning',
    imageFile: 'carpet-cleaning.jpg',
    publicFile: 'carpet-cleaning.jpg',
    title: 'Carpet Dry Cleaning',
    description:
      'Deep cleaning for rugs and carpets with vacuuming, foam treatment and stain spotting.',
    detailDescription:
      'Suitable for routine carpet refresh, dust removal and visible spot cleaning at home.',
    price: 1200,
    originalPrice: 1600,
    duration: '60 min',
    rating: 4.75,
    reviews: 310,
    badge: 'Dust care',
    serviceType: 'Carpet Cleaning',
    includes: [
      'Deep vacuuming',
      'Foam treatment',
      'Brush cleaning',
      'Stain spot cleaning',
      'Final grooming',
    ],
    details: [
      'Carpet vacuumed thoroughly',
      'Foam treatment applied on surface',
      'Brush cleaning done for visible dirt',
      'Common stains spot-treated',
      'Drying and care instructions shared',
    ],
    excludes: [
      'Color restoration',
      'Tear repair',
      'Wall-to-wall carpet removal',
      'Permanent stain guarantee',
      'Water damage treatment',
    ],
  },
  {
    id: 'office-maintenance',
    categoryId: 'subscriptions',
    subcategoryId: 'commercial',
    imageFile: 'office maintainance visite.jpg',
    publicFile: 'office-maintenance-visit.jpg',
    title: 'Office Maintenance Visit',
    description:
      'Commercial maintenance visit for electrical, plumbing, HVAC and facility checks.',
    detailDescription:
      'Designed for offices and shops that need regular inspection, clear reporting and priority repair planning.',
    price: 12999,
    originalPrice: 16000,
    duration: 'Half day',
    rating: 4.88,
    reviews: 196,
    badge: 'B2B',
    serviceType: 'Office Visit',
    includes: [
      'Facility walkthrough',
      'Basic electrical inspection',
      'Plumbing inspection',
      'HVAC basics check',
      'Priority repair plan',
    ],
    details: [
      'Office facility walkthrough completed',
      'Common electrical issues checked',
      'Washroom and pantry plumbing inspected',
      'AC and ventilation basics reviewed',
      'Maintenance checklist shared',
    ],
    excludes: [
      'Spare parts',
      'Civil work',
      'After-hours emergency repair',
      'Heavy electrical rewiring',
      'Annual contract charges',
    ],
  },
];

const homeSlides = [
  {
    id: 'flash-cleaning',
    badge: 'Home Refresh',
    title: 'Deep Cleaning\nFor Every Home',
    subtitle: 'Kitchen, bathroom, floor and sofa care with trained teams.',
    buttonLabel: 'Book Cleaning',
    categoryId: 'cleaning',
    categoryTitle: 'Cleaning',
    visual: 'CLEAN',
    imageUrl: '/uploads/seedappContent/full-home-deep-cleaning.webp',
    primaryColor: '#0b1c30',
    secondaryColor: '#213145',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'quick-ac',
    badge: 'Quick Help',
    title: 'AC Service\nAt Your Doorstep',
    subtitle: 'Service, gas refill, installation and dismounting.',
    buttonLabel: 'Fix AC',
    categoryId: 'home',
    categoryTitle: 'Home Services',
    visual: 'AC',
    imageUrl: '/uploads/seedappContent/ac-general-service.webp',
    primaryColor: '#0f766e',
    secondaryColor: '#134e4a',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'repair-care',
    badge: 'Repair Care',
    title: 'Plumbing & Geyser\nRepair Visits',
    subtitle: 'Trusted technicians for leaks, taps and water heaters.',
    buttonLabel: 'Book Repair',
    categoryId: 'home',
    categoryTitle: 'Home Services',
    visual: 'FIX',
    imageUrl: '/uploads/seedappContent/plumbing-repair.webp',
    primaryColor: '#131b2e',
    secondaryColor: '#006c49',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'care-plan',
    badge: 'Care Plan',
    title: 'Office & Home\nMaintenance Plans',
    subtitle: 'Routine checks, priority service and predictable care.',
    buttonLabel: 'View Plans',
    categoryId: 'subscriptions',
    categoryTitle: 'Subscriptions',
    visual: 'PRO',
    imageUrl: '/uploads/seedappContent/office-maintenance-visit.jpg',
    primaryColor: '#213145',
    secondaryColor: '#006c49',
    sortOrder: 4,
    isActive: true,
  },
];

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      subtitle VARCHAR(255) NOT NULL,
      icon VARCHAR(50) NOT NULL,
      tint VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id VARCHAR(50) PRIMARY KEY,
      category_id VARCHAR(50) NOT NULL,
      title VARCHAR(100) NOT NULL,
      description VARCHAR(255) NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(50) PRIMARY KEY,
      category_id VARCHAR(50) NOT NULL,
      subcategory_id VARCHAR(50) DEFAULT NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      original_price DECIMAL(10, 2) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
      reviews INT NOT NULL DEFAULT 0,
      badge VARCHAR(50) DEFAULT NULL,
      service_type VARCHAR(80) NOT NULL DEFAULT 'Standard Visit',
      image_url LONGTEXT NULL,
      detail_description TEXT NULL,
      details JSON NULL,
      includes JSON NOT NULL,
      excludes JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_slides (
      id VARCHAR(80) PRIMARY KEY,
      badge VARCHAR(80) NOT NULL,
      title VARCHAR(180) NOT NULL,
      subtitle TEXT NOT NULL,
      button_label VARCHAR(80) NOT NULL,
      category_id VARCHAR(50) NOT NULL,
      category_title VARCHAR(100) NOT NULL,
      visual VARCHAR(40) NOT NULL,
      image_url LONGTEXT NULL,
      primary_color VARCHAR(20) NOT NULL,
      secondary_color VARCHAR(20) NOT NULL,
      sort_order INT NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function copySeedImages() {
  await mkdir(publicImageDir, {recursive: true});

  for (const service of services) {
    await copyFile(
      path.join(sourceImageDir, service.imageFile),
      path.join(publicImageDir, service.publicFile),
    );
  }
}

async function seedCategories() {
  for (const category of categories) {
    await pool.query(
      `INSERT INTO categories (id, title, subtitle, icon, tint)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        icon = EXCLUDED.icon,
        tint = EXCLUDED.tint`,
      [
        category.id,
        category.title,
        category.subtitle,
        category.icon,
        category.tint,
      ],
    );
  }
}

async function seedSubcategories() {
  for (const subcategory of subcategories) {
    await pool.query(
      `INSERT INTO subcategories (id, category_id, title, description)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description`,
      [
        subcategory.id,
        subcategory.categoryId,
        subcategory.title,
        subcategory.description,
      ],
    );
  }
}

async function seedServices() {
  for (const service of services) {
    await pool.query(
      `INSERT INTO services
       (id, category_id, subcategory_id, title, description, price,
       original_price, duration, rating, reviews, badge, service_type,
        image_url, detail_description, details, includes, excludes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        subcategory_id = EXCLUDED.subcategory_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        duration = EXCLUDED.duration,
        rating = EXCLUDED.rating,
        reviews = EXCLUDED.reviews,
        badge = EXCLUDED.badge,
        service_type = EXCLUDED.service_type,
        image_url = EXCLUDED.image_url,
        detail_description = EXCLUDED.detail_description,
        details = EXCLUDED.details,
        includes = EXCLUDED.includes,
        excludes = EXCLUDED.excludes`,
      [
        service.id,
        service.categoryId,
        service.subcategoryId,
        service.title,
        service.description,
        service.price,
        service.originalPrice,
        service.duration,
        service.rating,
        service.reviews,
        service.badge,
        service.serviceType,
        `${publicImageBase}/${service.publicFile}`,
        service.detailDescription,
        JSON.stringify(service.details),
        JSON.stringify(service.includes),
        JSON.stringify(service.excludes),
      ],
    );
  }
}

async function seedHomeSlides() {
  for (const slide of homeSlides) {
    await pool.query(
      `INSERT INTO home_slides
       (id, badge, title, subtitle, button_label, category_id, category_title,
        visual, image_url, primary_color, secondary_color, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
        badge = EXCLUDED.badge,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        button_label = EXCLUDED.button_label,
        category_id = EXCLUDED.category_id,
        category_title = EXCLUDED.category_title,
        visual = EXCLUDED.visual,
        image_url = EXCLUDED.image_url,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active`,
      [
        slide.id,
        slide.badge,
        slide.title,
        slide.subtitle,
        slide.buttonLabel,
        slide.categoryId,
        slide.categoryTitle,
        slide.visual,
        slide.imageUrl,
        slide.primaryColor,
        slide.secondaryColor,
        slide.sortOrder,
        slide.isActive ? 1 : 0,
      ],
    );
  }
}

async function cleanupLegacyContentRows() {
  await pool.query(`
    DELETE s FROM services s
    LEFT JOIN order_items oi ON oi.service_id = s.id
    WHERE oi.id IS NULL
      AND (s.id = '' OR s.title = '' OR s.id = 'ac-gass-refill')
  `);

  await pool.query(`
    DELETE c FROM categories c
    LEFT JOIN services s ON s.category_id = c.id
    WHERE c.id = 'salon'
      AND s.id IS NULL
  `);
}

async function seed() {
  try {
    await ensureTables();
    await copySeedImages();
    await seedCategories();
    await seedSubcategories();
    await seedServices();
    await seedHomeSlides();
    await cleanupLegacyContentRows();

    console.log(`Seeded ${services.length} services with images.`);
    console.log(`Seeded ${homeSlides.length} home header slides.`);
    console.log(`Public image folder: ${publicImageDir}`);
  } catch (error) {
    console.error('Service content seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();

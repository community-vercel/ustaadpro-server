import pool from '../config/db.js';
import AppControl from '../models/AppControl.js';

const categories = [
  {
    id: 'home',
    title: 'Home Services',
    subtitle: 'AC, plumbing, electrical',
    icon: 'tools',
    tint: '#006C49', // secondary (Mint/Emerald)
  },
  {
    id: 'cleaning',
    title: 'Cleaning',
    subtitle: 'Deep clean and sofa care',
    icon: 'sparkle',
    tint: '#0B1C30', // on-surface (Deep Navy)
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    subtitle: 'Monthly care bundles',
    icon: 'calendar',
    tint: '#213145', // inverse-surface
  },
];

const subcategories = [
  {
    id: 'ac-services',
    categoryId: 'home',
    title: 'AC Services',
    description: 'General service, installation, and dismounting',
  },
  {
    id: 'plumbing-services',
    categoryId: 'home',
    title: 'Plumbing Services',
    description: 'Leakage, taps, and pipe repairs',
  },
  {
    id: 'home-cleaning',
    categoryId: 'cleaning',
    title: 'Home Cleaning',
    description: 'Full house deep cleaning',
  },
  {
    id: 'sofa-carpet-cleaning',
    categoryId: 'cleaning',
    title: 'Sofa & Carpet Care',
    description: 'Shampoo and vacuum cleaning',
  },
  {
    id: 'commercial',
    categoryId: 'subscriptions',
    title: 'Commercial Care',
    description: 'B2B subscription maintenance services',
  },
];

const services = [
  {
    id: 'ac-general-service',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    title: 'AC General Service',
    description: 'Complete indoor and outdoor AC inspection with filter wash.',
    price: 2499,
    originalPrice: 3200,
    duration: '60-75 min',
    rating: 4.86,
    reviews: 1240,
    badge: 'Most booked',
    includes: [
      'Filter and coil wash',
      'Gas pressure check',
      'Drain tray cleaning',
    ],
    excludes: [
      'Gas refilling',
      'Parts replacement',
      'Wall breaking or concealed work',
    ],
  },
  {
    id: 'ac-installation',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    title: 'AC Installation',
    description:
      'Wall mounted split AC installation with professional alignment.',
    price: 7999,
    originalPrice: 9500,
    duration: '2-3 hrs',
    rating: 4.78,
    reviews: 840,
    badge: null,
    includes: [
      'Indoor and outdoor mounting',
      'Pipe fitting up to 10 ft',
      'Cooling test',
    ],
    excludes: [
      'Copper pipe beyond 10 ft',
      'Bracket fabrication',
      'Electrical rewiring',
    ],
  },
  {
    id: 'ac-dismounting',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    title: 'AC Dismounting',
    description:
      'Professional split AC dismounting with safe refrigerant locking.',
    price: 1999,
    originalPrice: 2500,
    duration: '45-60 min',
    rating: 4.8,
    reviews: 320,
    badge: 'New',
    includes: [
      'Outdoor unit dismounting',
      'Indoor unit removal',
      'Gas lock check',
      'Pipe wrapping',
    ],
    excludes: [
      'Transport to new location',
      'Wall hole plastering/sealing',
      'Bracket installation',
    ],
  },
  {
    id: 'ac-gas-refill',
    categoryId: 'home',
    subcategoryId: 'ac-services',
    title: 'AC Gas Refill',
    description: 'Complete gas top-up with leak inspection for split ACs.',
    price: 4500,
    originalPrice: 5500,
    duration: '60 min',
    rating: 4.85,
    reviews: 410,
    badge: 'Summer Special',
    includes: ['Leakage test', 'Gas pressure check', 'R-22 / R-410A top-up'],
    excludes: ['Major pipe replacement', 'Compressor repair', 'Service wash'],
  },
  {
    id: 'plumbing-visit',
    categoryId: 'home',
    subcategoryId: 'plumbing-services',
    title: 'Plumbing Repair Visit',
    description: 'Leakage, tap, drain, and fixture repair diagnosis at home.',
    price: 999,
    originalPrice: 1400,
    duration: '45 min',
    rating: 4.72,
    reviews: 610,
    badge: null,
    includes: ['Leak inspection', 'Minor tap repair', 'Repair estimate'],
    excludes: ['Sanitary fittings', 'Major pipeline work', 'Tile replacement'],
  },
  {
    id: 'geyser-repair',
    categoryId: 'home',
    subcategoryId: 'plumbing-services',
    title: 'Geyser / Water Heater Repair',
    description: 'Thermostat, element replacement, and general geyser service.',
    price: 1500,
    originalPrice: 2000,
    duration: '60 min',
    rating: 4.65,
    reviews: 180,
    badge: null,
    includes: ['Thermostat check', 'Heating element test', 'Minor leak fix'],
    excludes: ['New parts cost', 'Geyser replacement', 'Wiring updates'],
  },
  {
    id: 'deep-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'home-cleaning',
    title: 'Full Home Deep Cleaning',
    description:
      'Machine-assisted cleaning for bedrooms, lounge, kitchen, and baths.',
    price: 14999,
    originalPrice: 18000,
    duration: '5-7 hrs',
    rating: 4.91,
    reviews: 430,
    badge: 'Premium',
    includes: [
      'Kitchen degreasing',
      'Bathroom descaling',
      'Floor machine scrub',
    ],
    excludes: [
      'Pest control',
      'Exterior windows',
      'Furniture shifting beyond 25 kg',
    ],
  },
  {
    id: 'water-tank-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'home-cleaning',
    title: 'Water Tank Cleaning',
    description: 'Underground and overhead water tank mechanical cleaning.',
    price: 2500,
    originalPrice: 3500,
    duration: '90-120 min',
    rating: 4.88,
    reviews: 215,
    badge: 'Essential',
    includes: ['Sludge removal', 'High-pressure wash', 'Anti-bacterial spray'],
    excludes: ['Tank crack repair', 'Plumbing fixes', 'Water pump repair'],
  },
  {
    id: 'sofa-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'sofa-carpet-cleaning',
    title: 'Sofa Shampoo Cleaning',
    description: 'Wet vacuum and fabric-safe shampoo cleaning for sofa sets.',
    price: 3499,
    originalPrice: 4500,
    duration: '90 min',
    rating: 4.8,
    reviews: 522,
    badge: null,
    includes: ['Dust extraction', 'Fabric shampoo', 'Wet vacuum drying'],
    excludes: [
      'Leather polishing',
      'Permanent stain removal',
      'Cushion repair',
    ],
  },
  {
    id: 'carpet-dry-cleaning',
    categoryId: 'cleaning',
    subcategoryId: 'sofa-carpet-cleaning',
    title: 'Carpet Dry Cleaning',
    description: 'Deep mechanical dry cleaning for rugs and carpets.',
    price: 1200,
    originalPrice: 1600,
    duration: '60 min',
    rating: 4.75,
    reviews: 310,
    badge: null,
    includes: ['Deep vacuuming', 'Foam treatment', 'Stain spot cleaning'],
    excludes: ['Color restoration', 'Tear repair', 'Wall-to-wall carpet removal'],
  },
  {
    id: 'office-maintenance',
    categoryId: 'subscriptions',
    subcategoryId: 'commercial',
    title: 'Office Maintenance Visit',
    description:
      'Commercial inspection for electrical, plumbing, and HVAC basics.',
    price: 12999,
    originalPrice: 16000,
    duration: 'Half day',
    rating: 4.88,
    reviews: 196,
    badge: 'B2B',
    includes: [
      'Facility walkthrough',
      'Priority repair plan',
      'Compliance checklist',
    ],
    excludes: ['Spare parts', 'Civil work', 'After-hours emergency repair'],
  },
];

const subscriptions = [
  {
    id: 'one-month',
    title: 'Essential Care',
    duration: '1 month',
    price: 8999,
    originalPrice: 11000,
    perks: ['1 AC checkup', '1 plumbing visit', 'Priority booking'],
  },
  {
    id: 'three-month',
    title: 'Quarterly Home Shield',
    duration: '3 months',
    price: 24999,
    originalPrice: 31000,
    perks: [
      '3 routine checkups',
      '1 deep bathroom clean',
      '15% service discount',
    ],
  },
  {
    id: 'six-month',
    title: 'Family Maintenance',
    duration: '6 months',
    price: 44999,
    originalPrice: 59000,
    perks: [
      'Bi-monthly inspections',
      'AC service bundle',
      'Dedicated coordinator',
    ],
  },
  {
    id: 'one-year',
    title: 'Theka Business Plus',
    duration: '1 year',
    price: 119999,
    originalPrice: 155000,
    perks: [
      'Monthly office visits',
      'Emergency response window',
      'Quarterly deep clean',
    ],
  },
];

async function seed() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Successfully connected to database.');

    // Disable foreign key checks for clean truncation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE order_items');
    await connection.query('TRUNCATE TABLE orders');
    await connection.query('TRUNCATE TABLE app_settings');
    await connection.query('TRUNCATE TABLE home_slides');
    await connection.query('TRUNCATE TABLE subscriptions');
    await connection.query('TRUNCATE TABLE services');
    await connection.query('TRUNCATE TABLE subcategories');
    await connection.query('TRUNCATE TABLE categories');
    await connection.query('TRUNCATE TABLE auth_otps');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Truncated existing tables.');

    // Insert categories
    for (const cat of categories) {
      await connection.query(
        'INSERT INTO categories (id, title, subtitle, icon, tint) VALUES (?, ?, ?, ?, ?)',
        [cat.id, cat.title, cat.subtitle, cat.icon, cat.tint],
      );
    }
    console.log('Seeded categories.');

    // Insert subcategories
    for (const subcat of subcategories) {
      await connection.query(
        'INSERT INTO subcategories (id, category_id, title, description) VALUES (?, ?, ?, ?)',
        [subcat.id, subcat.categoryId, subcat.title, subcat.description],
      );
    }
    console.log('Seeded subcategories.');

    // Insert services
    for (const s of services) {
      await connection.query(
        `INSERT INTO services 
        (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, includes, excludes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.categoryId,
          s.subcategoryId,
          s.title,
          s.description,
          s.price,
          s.originalPrice,
          s.duration,
          s.rating,
          s.reviews,
          s.badge,
          JSON.stringify(s.includes),
          JSON.stringify(s.excludes),
        ],
      );
    }
    console.log('Seeded services.');

    // Insert subscriptions
    for (const sub of subscriptions) {
      await connection.query(
        'INSERT INTO subscriptions (id, title, duration, price, original_price, perks) VALUES (?, ?, ?, ?, ?, ?)',
        [
          sub.id,
          sub.title,
          sub.duration,
          sub.price,
          sub.originalPrice,
          JSON.stringify(sub.perks),
        ],
      );
    }
    console.log('Seeded subscriptions.');
    await AppControl.ensureSchema();
    console.log('Seeded app controls.');
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (connection) connection.release();
    process.exit();
  }
}

seed();

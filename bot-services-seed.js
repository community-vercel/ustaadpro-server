import pool from './config/db.js';
import AppControl from './models/AppControl.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BOT & APP SERVICES SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════

const categories = [
  {
    id: 'ac-services',
    title: 'AC Services',
    subtitle: 'Maintenance, installation, gas refill and dismounting',
    icon: 'air-conditioner',
    tint: '#4F46E5',
    sortOrder: 1,
  },
  {
    id: 'electrician',
    title: 'Electrician',
    subtitle: 'Wiring, fans, lights, sockets and breaker repairs',
    icon: 'lightning-bolt',
    tint: '#F59E0B',
    sortOrder: 2,
  },
  {
    id: 'plumbers',
    title: 'Plumber',
    subtitle: 'Pipes, leaks, geyser, taps and sanitary works',
    icon: 'wrench',
    tint: '#0891B2',
    sortOrder: 3,
  },
  {
    id: 'home-cleaning',
    title: 'Home Cleaning',
    subtitle: 'Deep cleaning, water tank, kitchen and bathroom care',
    icon: 'sparkles',
    tint: '#006C49',
    sortOrder: 4,
  },
  {
    id: 'dry-cleaning',
    title: 'Dry Cleaning',
    subtitle: 'Sofa, carpet, rug and mattress shampoo cleaning',
    icon: 'sparkle',
    tint: '#213145',
    sortOrder: 5,
  },
  {
    id: 'painters',
    title: 'Painters',
    subtitle: 'Wall painting, polishing, putty and waterproofing',
    icon: 'format-paint',
    tint: '#D97706',
    sortOrder: 6,
  },
  {
    id: 'carpenter',
    title: 'Carpenter',
    subtitle: 'Furniture repair, doors, windows, locks and cabinets',
    icon: 'hammer',
    tint: '#92400E',
    sortOrder: 7,
  },
  {
    id: 'welder-fabricator',
    title: 'Welder & Fabricator',
    subtitle: 'Gate, grill, stairs, glass and ceiling fabrication',
    icon: 'anvil',
    tint: '#4B5563',
    sortOrder: 8,
  },
  {
    id: 'cctv',
    title: 'CCTV Services',
    subtitle: 'Installation, wireless setup and camera maintenance',
    icon: 'cctv',
    tint: '#1E3A8A',
    sortOrder: 9,
  },
  {
    id: 'subscriptions',
    title: 'Office Maintenance',
    subtitle: 'Regular office inspection and maintenance visits',
    icon: 'calendar',
    tint: '#DB2777',
    sortOrder: 10,
  },
];

const services = [
  // ── AC Services ─────────────────────────────────────────────────────────────
  {
    id: 'ac-general-service',
    categoryId: 'ac-services',
    title: 'AC General Service',
    description: 'Complete indoor and outdoor AC service with pressure wash.',
    serviceType: 'Per AC Unit',
    price: 2000,
    originalPrice: 2400,
    workPrices: [
      { title: 'AC General Service (1 to 1.5 Ton)', description: 'Full chemical wash and filter cleaning.', price: 2000 },
      { title: 'AC General Service (2 to 2.5 Ton)', description: 'Complete service for large AC units.', price: 2500 },
      { title: 'Inverter AC Deep Service', description: 'Deep PCB and blower cleaning.', price: 2800 },
      { title: 'AC Filter & Grill Cleaning', description: 'Basic filter and front grill wash.', price: 1000 },
    ],
  },
  {
    id: 'ac-installation-dismount',
    categoryId: 'ac-services',
    title: 'AC Installation & Dismounting',
    description: 'Professional wall mount installation and safe dismounting.',
    serviceType: 'Per Unit',
    price: 1200,
    originalPrice: 1500,
    workPrices: [
      { title: 'AC Dismounting (1 to 2.5 tons)', description: 'Safe removal of indoor and outdoor units.', price: 1200 },
      { title: 'AC Installation with standard fitting', description: 'Mounting indoor & outdoor units on existing pipe.', price: 3000 },
      { title: 'AC Installation with 10 Feet pipe', description: 'Complete installation with piping.', price: 4500 },
      { title: 'AC Outdoor Bracket Installation', description: 'Heavy-duty steel bracket mounting.', price: 1500 },
    ],
  },
  {
    id: 'ac-gas-refill-check',
    categoryId: 'ac-services',
    title: 'AC Gas Refill & Pressure Check',
    description: 'Refrigerant pressure testing, leak detection and gas top-up.',
    serviceType: 'Per AC',
    price: 800,
    originalPrice: 1000,
    workPrices: [
      { title: 'AC Gas Pressure Check', description: 'Gauge check and leak diagnosis.', price: 800 },
      { title: 'AC Gas Refill (R22 Refrigerant)', description: 'Complete cylinder top-up / refill.', price: 4500 },
      { title: 'AC Gas Refill (R410A / R32 Inverter)', description: 'High-pressure refrigerant refill.', price: 5500 },
      { title: 'Capacitor Replacement', description: 'Replace faulty compressor capacitor.', price: 1500 },
    ],
  },

  // ── Electrician ─────────────────────────────────────────────────────────────
  {
    id: 'electrician-fans-lights',
    categoryId: 'electrician',
    title: 'Fans & Lights Services',
    description: 'Installation, wiring and repair for fans, chandeliers and lights.',
    serviceType: 'Per Fixture',
    price: 400,
    originalPrice: 500,
    workPrices: [
      { title: 'Light / Bulb Fitting Installation', description: 'Install light fixtures or holders.', price: 400 },
      { title: 'LED Light Installation', description: 'Ceiling downlight or panel LED fitting.', price: 500 },
      { title: 'Ceiling Fan Repairing', description: 'Capacitor, bearing or speed issue repair.', price: 500 },
      { title: 'Ceiling Fan Installation', description: 'Mount and connect new ceiling fan.', price: 700 },
      { title: 'Exhaust Fan Installation', description: 'Kitchen or washroom exhaust fan fitting.', price: 700 },
      { title: 'Outdoor Light Installation', description: 'Wall or garden weatherproof light fitting.', price: 800 },
      { title: 'Chandelier Installation', description: 'Fancy chandelier assembly and mounting.', price: 1500 },
    ],
  },
  {
    id: 'electrician-switches-breakers',
    categoryId: 'electrician',
    title: 'Switches, Sockets & Breakers',
    description: 'Replacement and repair of switch boards, breakers and distribution boxes.',
    serviceType: 'Per Point',
    price: 500,
    originalPrice: 650,
    workPrices: [
      { title: 'Socket / Switch Replacement', description: 'Single socket or switch replacement.', price: 500 },
      { title: 'Switch Board Repair', description: 'Repair sparking or loose switch board.', price: 700 },
      { title: 'Single Phase Breaker Replacement', description: 'Replace faulty circuit breaker.', price: 800 },
      { title: 'Change Over Switch Installation', description: 'Manual or auto generator/WAPDA changeover.', price: 1100 },
      { title: 'DB Board Repair', description: 'Distribution box loose connection or breaker check.', price: 1000 },
      { title: 'Single Phase Distribution Box Installation', description: 'Install new DB with breakers.', price: 2000 },
      { title: 'DB Board Complete Installation', description: 'Complete main board setup.', price: 2500 },
    ],
  },
  {
    id: 'electrician-wiring-troubleshoot',
    categoryId: 'electrician',
    title: 'House Wiring & Troubleshooting',
    description: 'Short circuit troubleshooting, UPS installation, rewiring and earthing.',
    serviceType: 'Per Job',
    price: 600,
    originalPrice: 800,
    workPrices: [
      { title: 'Door Bell Installation', description: 'Install wired or wireless doorbell.', price: 600 },
      { title: 'Short Circuit Repair', description: 'Locate and fix power tripping / short circuit.', price: 1000 },
      { title: 'Power Failure Troubleshooting', description: 'Complete house phase and supply diagnostic.', price: 1200 },
      { title: 'Electrical Safety Inspection', description: 'Comprehensive home electrical audit.', price: 1500 },
      { title: 'UPS / Inverter Installation', description: 'Connect UPS and battery with load distribution.', price: 2500 },
      { title: 'Earthing Installation', description: 'Ground rod and safety earthing wire setup.', price: 3000 },
      { title: 'House Wiring Visit', description: 'New room or whole house wiring estimate/work.', price: 2500 },
      { title: 'Generator Wiring Connection', description: 'Safe generator tie-in to DB board.', price: 4000 },
    ],
  },
  {
    id: 'electrician-appliances-tv',
    categoryId: 'electrician',
    title: 'Appliances & TV Mounting',
    description: 'Washing machine repair, TV mounting, LCD/LED TV check.',
    serviceType: 'Per Unit',
    price: 700,
    originalPrice: 900,
    workPrices: [
      { title: 'Automatic Washing Machine Repairing', description: 'Motor, drain or belt inspection.', price: 700 },
      { title: 'Kitchen Hood Repair', description: 'Exhaust motor and filter repair.', price: 800 },
      { title: 'TV Wall Mount Installation', description: 'Wall bracket fitting and TV hanging.', price: 1500 },
      { title: 'LCD/LED TV Repair Inspection', description: 'Diagnosis of display or motherboard issue.', price: 2500 },
    ],
  },

  // ── Plumber ─────────────────────────────────────────────────────────────────
  {
    id: 'plumber-general-repairs',
    categoryId: 'plumbers',
    title: 'Plumbing Repairs & Leakage',
    description: 'General plumbing visit, water leaks, pipe fitting and tap repairs.',
    serviceType: 'Per Visit',
    price: 700,
    originalPrice: 850,
    workPrices: [
      { title: 'Plumbing Repair Visit', description: 'Standard visit for minor leaks & inspection.', price: 700 },
      { title: 'Tap / Muslim Shower Repair', description: 'Fix dripping tap or broken shower.', price: 500 },
      { title: 'Leakage Repair', description: 'Concealed or open pipe leak diagnosis & fix.', price: 800 },
      { title: 'Sanitary Fitting', description: 'Wash basin, sink or mixer tap fitting.', price: 800 },
      { title: 'Pipe Fitting (per running foot)', description: 'PPRC or GI pipe joint and routing.', price: 150 },
      { title: 'Drainage / Sewer Cleaning', description: 'Unclog choked bathroom or kitchen drain.', price: 1500 },
    ],
  },
  {
    id: 'plumber-geyser-motors',
    categoryId: 'plumbers',
    title: 'Geyser & Water Pump Services',
    description: 'Gas/Electric geyser installation, service and water motor repair.',
    serviceType: 'Per Unit',
    price: 800,
    originalPrice: 1000,
    workPrices: [
      { title: 'Electric Geyser Dismounting', description: 'Safe removal of electric geyser unit.', price: 800 },
      { title: 'Gas Geyser Dismounting', description: 'Safe removal and gas valve isolation.', price: 1200 },
      { title: 'Geyser Water Heater Repair', description: 'Thermostat, burner or element repair.', price: 1000 },
      { title: 'Water Motor / Pump Installation', description: 'Connect donor pump with check valve.', price: 1200 },
      { title: 'Gas Geyser Service & Descaling', description: 'Coil cleaning and burner tune-up.', price: 2200 },
      { title: 'Gas/Electric Geyser Installation', description: 'Complete mounting with inlet/outlet pipes.', price: 2800 },
      { title: 'Commode Installation', description: 'Commode fitting and wax ring sealing.', price: 2500 },
      { title: 'Commode Tank Repair', description: 'Siphon, float valve and push button fix.', price: 1200 },
    ],
  },

  // ── Home Cleaning ───────────────────────────────────────────────────────────
  {
    id: 'water-tank-cleaning',
    categoryId: 'home-cleaning',
    title: 'Water Tank Cleaning',
    description: 'High-pressure mechanized cleaning and chemical disinfection.',
    serviceType: 'Per Tank',
    price: 1600,
    originalPrice: 2000,
    workPrices: [
      { title: 'Plastic Tank (150 - 300 Gallons)', description: 'Overhead small plastic tank cleaning.', price: 1600 },
      { title: 'Plastic Tank (350 - 500 Gallons)', description: 'Medium overhead plastic tank cleaning.', price: 2000 },
      { title: 'Plastic Tank (550 - 1000 Gallons)', description: 'Large capacity overhead tank cleaning.', price: 2500 },
      { title: 'Cement Tank Overhead (Small)', description: 'Cement roof tank scrub & wash.', price: 2200 },
      { title: 'Cement Tank Overhead (Large)', description: 'Large cement roof tank scrub & disinfection.', price: 3000 },
      { title: 'Underground Tank (Small 3x5 ft)', description: 'Underground water tank deep scrub.', price: 3000 },
      { title: 'Underground Tank (Large 6x8 ft)', description: 'Large underground water storage tank.', price: 3500 },
    ],
  },
  {
    id: 'deep-cleaning',
    categoryId: 'home-cleaning',
    title: 'Deep Cleaning Services',
    description: 'Complete home, kitchen, bathroom and outdoor deep cleaning.',
    serviceType: 'Per Area',
    price: 500,
    originalPrice: 650,
    workPrices: [
      { title: 'Full House Deep Clean Survey', description: 'Inspection & custom quote for full home.', price: 500 },
      { title: 'Single Washroom Deep Cleaning', description: 'Tiles, commode, mirror and scale removal.', price: 2400 },
      { title: 'Kitchen Deep Cleaning', description: 'Degreasing stove, cabinets, exhaust and tiles.', price: 2800 },
      { title: 'Gardener Visit & Pruning', description: 'Lawn mowing, pruning and garden care.', price: 1500 },
      { title: 'Full House Deep Cleaning (Standard)', description: 'Complete residential deep cleaning.', price: 8000 },
    ],
  },

  // ── Dry Cleaning (Sofa & Fabric) ────────────────────────────────────────────
  {
    id: 'sofa-cleaning',
    categoryId: 'dry-cleaning',
    title: 'Sofa & Upholstery Cleaning',
    description: 'Shampoo wash, stain extraction and fabric vacuuming.',
    serviceType: 'Per Item',
    price: 250,
    originalPrice: 300,
    workPrices: [
      { title: 'Sofa Cleaning (Per Seat - Min 4)', description: 'Individual sofa seat shampoo.', price: 250 },
      { title: 'Dewan Cleaning', description: 'Complete dewan shampoo & drying.', price: 1099 },
      { title: 'Sofa Cum Bed Cleaning', description: 'Full sofa bed deep extraction.', price: 1350 },
      { title: '5-Seater Sofa Set Cleaning', description: 'Complete 3+1+1 or 3+2 sofa set wash.', price: 1300 },
      { title: '6-Seater Sofa Set Cleaning', description: 'Complete 6-seater sofa set shampoo.', price: 1599 },
      { title: '7-Seater Sofa Set Cleaning', description: 'Complete 7-seater sofa set shampoo.', price: 1890 },
      { title: '10-Seater Sofa Set Cleaning', description: 'Large drawing room sofa deep shampoo.', price: 2690 },
      { title: 'Dining Chairs (6 Seats)', description: 'Fabric chair seat & back shampoo.', price: 1600 },
      { title: 'Dining Chairs (8 to 12 Seats)', description: 'Large dining chair set cleaning.', price: 2600 },
    ],
  },
  {
    id: 'carpet-mattress-cleaning',
    categoryId: 'dry-cleaning',
    title: 'Carpet, Rug & Mattress Cleaning',
    description: 'Vacuum extraction, anti-bacterial shampoo and dust removal.',
    serviceType: 'Per Unit',
    price: 25,
    originalPrice: 30,
    workPrices: [
      { title: 'Carpet Shampoo (Per Sq Ft)', description: 'Fitted or loose room carpet cleaning.', price: 25 },
      { title: 'Rug Shampoo (Per Sq Ft)', description: 'Persian or woolen rug deep wash.', price: 30 },
      { title: 'Blind Cleaning (Per Blind)', description: 'Window blind dust and stain removal.', price: 800 },
      { title: 'Curtain Cleaning (Per Curtain)', description: 'Heavy curtain shampoo wash.', price: 1000 },
      { title: 'Single Mattress Cleaning', description: 'Deep vacuum and stain removal.', price: 1600 },
      { title: 'Double / King Mattress Cleaning', description: 'Full two-sided mattress shampoo.', price: 2000 },
    ],
  },

  // ── Painter ─────────────────────────────────────────────────────────────────
  {
    id: 'painter-services',
    categoryId: 'painters',
    title: 'Wall Painting & Wood Polish',
    description: 'Interior, exterior, texture painting, putty and wood polish.',
    serviceType: 'Per Job',
    price: 500,
    originalPrice: 600,
    workPrices: [
      { title: 'Painter Visit & Measurement', description: 'Site survey, color consultation and quote.', price: 500 },
      { title: 'Wall Putty Works (Per Sq Ft)', description: 'Surface preparation and putty smoothing.', price: 22 },
      { title: 'Waterproofing (Per Sq Ft)', description: 'Roof/wall seepage protection coating.', price: 70 },
      { title: 'Texture Painting (Per Sq Ft)', description: 'Feature wall designer texture coat.', price: 75 },
      { title: 'Wood Polishing (Per Sq Ft)', description: 'Lacquer or spirit polish for doors/furniture.', price: 110 },
      { title: 'Gray Structure Paint (Visit)', description: 'Base primer and preparation survey.', price: 500 },
    ],
  },

  // ── Carpenter ───────────────────────────────────────────────────────────────
  {
    id: 'carpenter-services',
    categoryId: 'carpenter',
    title: 'Furniture & Wood Works',
    description: 'Furniture repair, door installation, locks, cabinets and wardrobes.',
    serviceType: 'Per Job',
    price: 500,
    originalPrice: 600,
    workPrices: [
      { title: 'Carpenter Visit & Inspection', description: 'Site check and minor wood repairs.', price: 500 },
      { title: 'Lock Installation / Replacement', description: 'Door handle, cylindrical or mortise lock.', price: 600 },
      { title: 'Furniture Repair', description: 'Chair, table or bed frame tightening & fix.', price: 1000 },
      { title: 'Window Frame / Shutter Repair', description: 'Wood window adjustment or installation.', price: 1800 },
      { title: 'Door Installation', description: 'Wooden door fitting, hinges and planning.', price: 2000 },
      { title: 'Cabinet Making (Per Sq Ft)', description: 'Kitchen and room cabinet woodwork.', price: 500 },
      { title: 'Wardrobe Making (Per Sq Ft)', description: 'Custom fitted wardrobe woodwork.', price: 700 },
      { title: 'Curtain Rod / Blind Fitting', description: 'Curtain pipe or pelmet installation.', price: 600 },
    ],
  },

  // ── Welder & Fabricator ─────────────────────────────────────────────────────
  {
    id: 'welder-fabricator-services',
    categoryId: 'welder-fabricator',
    title: 'Welding & Metal Fabrication',
    description: 'Gate repair, window grills, stair welding, steel gates and ceiling.',
    serviceType: 'Per Job',
    price: 150,
    originalPrice: 200,
    workPrices: [
      { title: 'False Ceiling Works (Per Sq Ft)', description: 'Gypsum or POP ceiling framing and board.', price: 150 },
      { title: 'Steel Fabrication (Per Kg)', description: 'Custom structural steel welding.', price: 450 },
      { title: 'Glass Work (Per Sq Ft)', description: 'Tempered glass partition or railing.', price: 450 },
      { title: 'Window Grill Making (Per Sq Ft)', description: 'Iron safety grill fabrication.', price: 450 },
      { title: 'Iron Fence (Per Running Foot)', description: 'Boundary wall iron security fence.', price: 500 },
      { title: 'Steel Gate Making (Per Sq Ft)', description: 'Modern steel main gate fabrication.', price: 650 },
      { title: 'Aluminium Window (Per Sq Ft)', description: 'Aluminium sliding window frame & glass.', price: 900 },
      { title: 'Gate Repair / Hinge Welding', description: 'On-site welding for dropped or broken gates.', price: 1500 },
      { title: 'Stair Iron Welding', description: 'Metal staircase or spiral stair fabrication.', price: 2500 },
    ],
  },

  // ── CCTV Services ───────────────────────────────────────────────────────────
  {
    id: 'cctv-camera-services',
    categoryId: 'cctv',
    title: 'CCTV Cameras & Security',
    description: 'Camera installation, DVR/NVR setup, wireless cameras and maintenance.',
    serviceType: 'Per Camera',
    price: 1000,
    originalPrice: 1200,
    workPrices: [
      { title: 'CCTV System Maintenance Visit', description: 'Troubleshoot cameras, power supply or DVR.', price: 1000 },
      { title: 'Home CCTV Installation (Per Camera)', description: 'Mount camera, route BNC/Cat6 cable & test.', price: 1200 },
      { title: 'Wireless / WiFi CCTV Setup', description: 'Smart PTZ camera app configuration & mount.', price: 1500 },
      { title: 'DVR / NVR 4-8 Channel Setup', description: 'Hard drive installation, network & mobile viewing.', price: 2500 },
    ],
  },

  // ── Subscriptions / Office Maintenance ───────────────────────────────────────
  {
    id: 'office-maintenance-services',
    categoryId: 'subscriptions',
    title: 'Office & Commercial Maintenance',
    description: 'Routine maintenance visits for offices, shops and commercial premises.',
    serviceType: 'Per Visit',
    price: 1500,
    originalPrice: 1800,
    workPrices: [
      { title: 'Basic Electrical Audit Visit', description: 'Load check, breaker thermography and safety test.', price: 1500 },
      { title: 'Plumbing Audit & Inspection', description: 'Commercial washrooms and water line check.', price: 1500 },
      { title: 'Commercial HVAC Inspection', description: 'AC and ventilation health check.', price: 2000 },
      { title: 'Complete Facility Walkthrough', description: 'Comprehensive property maintenance inspection.', price: 2500 },
    ],
  },
];

export async function seedBotAndAppServices() {
  console.log('🚀 Starting bot and app services database seed...');

  try {
    await AppControl.ensureSchema();

    // 1. Seed Categories
    console.log(`📦 Seeding ${categories.length} categories...`);
    for (const cat of categories) {
      await pool.query(
        `INSERT INTO categories (id, title, subtitle, icon, tint, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           icon = EXCLUDED.icon,
           tint = EXCLUDED.tint,
           sort_order = EXCLUDED.sort_order,
           is_active = TRUE`,
        [cat.id, cat.title, cat.subtitle, cat.icon, cat.tint, cat.sortOrder],
      );
    }
    console.log('✅ Categories seeded successfully.');

    // 2. Seed Services and Work Prices
    console.log(`🛠️ Seeding ${services.length} services with dynamic work prices...`);
    for (const svc of services) {
      const minWorkPrice = svc.workPrices?.length
        ? Math.min(...svc.workPrices.map(w => Number(w.price || 0)))
        : svc.price;

      await pool.query(
        `INSERT INTO services
         (id, category_id, subcategory_id, title, description, price, original_price, duration, rating, reviews, badge, service_type, detail_description, details, includes, excludes, is_active)
         VALUES (?, ?, NULL, ?, ?, ?, ?, '45-90 min', 4.9, 150, 'Popular', ?, ?, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           original_price = EXCLUDED.original_price,
           service_type = EXCLUDED.service_type,
           is_active = TRUE`,
        [
          svc.id,
          svc.categoryId,
          svc.title,
          svc.description,
          minWorkPrice,
          svc.originalPrice || Math.round(minWorkPrice * 1.2),
          svc.serviceType || 'Standard Visit',
          svc.description,
        ],
      );

      // Replace work prices for this service
      await pool.query('DELETE FROM service_work_prices WHERE service_id = ?', [svc.id]);

      if (Array.isArray(svc.workPrices)) {
        for (const [index, wp] of svc.workPrices.entries()) {
          await pool.query(
            `INSERT INTO service_work_prices
             (service_id, title, description, price, image_url, sort_order)
             VALUES (?, ?, ?, ?, '', ?)`,
            [svc.id, wp.title, wp.description || '', wp.price, index],
          );
        }
      }
    }
    console.log('✅ Services and work prices seeded successfully.');

    console.log('\n🎉 Seed finished! All categories, services, and work prices are up to date.');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

// Execute if run directly via CLI
if (process.argv[1]?.endsWith('bot-services-seed.js')) {
  seedBotAndAppServices()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

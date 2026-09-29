import pool from './config/db.js';

// Read-only inspector: shows which painter/texture services exist so you know
// which SERVICE_ID_CANDIDATES to put in seedTextureDesigns.js.
try {
  const [rows] = await pool.query(
    `SELECT id, category_id, subcategory_id, title, price, service_type
     FROM services
     WHERE title ILIKE '%texture%'
        OR category_id ILIKE '%paint%'
     ORDER BY category_id, title`,
  );

  if (!rows.length) {
    console.log('No painter/texture services found in the services table.');
  } else {
    console.log(`Found ${rows.length} painter/texture service(s):\n`);
    for (const row of rows) {
      const [works] = await pool.query(
        'SELECT COUNT(*) AS count FROM service_work_prices WHERE service_id = ?',
        [row.id],
      );
      console.log(
        `• id: ${row.id}\n  title: "${row.title}" | category: ${row.category_id} | subcategory: ${row.subcategory_id || '(none)'} | price: Rs ${Number(row.price)} | ${row.service_type || ''} | existing designs: ${works[0].count}\n`,
      );
    }
    console.log('Copy the id you want into SERVICE_ID_CANDIDATES in seedTextureDesigns.js');
  }
} catch (err) {
  console.error('Inspection failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
  process.exit(process.exitCode || 0);
}

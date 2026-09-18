import pool from './config/db.js';
try {
  const [rows] = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_reviews' ORDER BY ordinal_position"
  );
  if (!rows.length) {
    console.log('TABLE service_reviews DOES NOT EXIST');
  } else {
    console.log('Columns:', rows.map(c => c.column_name + ': ' + c.data_type).join(', '));
  }

  // Try a test query to see if orders exist
  const [orders] = await pool.query("SELECT id, status, user_id FROM orders WHERE status = 'completed' LIMIT 5");
  console.log('Completed orders:', JSON.stringify(orders));

  const [items] = await pool.query("SELECT * FROM order_items LIMIT 5");
  console.log('Order items count:', items.length, items.length ? JSON.stringify(items[0]) : '');
} catch(e) {
  console.error('ERROR:', e.message);
}
process.exit(0);

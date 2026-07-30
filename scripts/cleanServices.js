import pool from '../config/db.js';
import AppControl from '../models/AppControl.js';

const confirmed = process.argv.includes('--confirm');

if (!confirmed) {
  console.error('Refusing to clear services without --confirm.');
  console.error('Run: npm run cleanServices -- --confirm');
  process.exitCode = 1;
} else {
  await AppControl.ensureSchema();
  const client = await pool.raw.connect();
  try {
    const bookingResult = await client.query('SELECT COUNT(*)::int AS count FROM order_items');
    const bookingCount = Number(bookingResult.rows[0]?.count || 0);

    await client.query('BEGIN');
    if (bookingCount > 0) {
      // Booked services are historical records. Keep them, but remove every
      // service from the public catalogue until it is explicitly re-published.
      const services = await client.query('UPDATE services SET is_active = FALSE WHERE COALESCE(is_active, TRUE) = TRUE');
      const categories = await client.query('UPDATE categories SET is_active = FALSE WHERE COALESCE(is_active, TRUE) = TRUE');
      await client.query('COMMIT');
      console.log(JSON.stringify({
        archived: {services: services.rowCount, categories: categories.rowCount},
        reason: 'Booked service history was preserved.',
        result: 'The public service catalogue is now empty. A seed or admin save reactivates published services.',
        untouched: ['order_items', 'orders', 'shop_products', 'shop_orders', 'shop_order_items'],
      }, null, 2));
    } else {
      const services = await client.query('DELETE FROM services');
      const subcategories = await client.query('DELETE FROM subcategories');
      const categories = await client.query('DELETE FROM categories');
      await client.query('COMMIT');
      console.log(JSON.stringify({
        deleted: {services: services.rowCount, subcategories: subcategories.rowCount, categories: categories.rowCount},
        untouched: ['shop_products', 'shop_orders', 'shop_order_items'],
      }, null, 2));
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Service cleanup failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
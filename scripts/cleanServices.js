import pool from '../config/db.js';

const confirmed = process.argv.includes('--confirm');

if (!confirmed) {
  console.error('Refusing to clear services without --confirm.');
  console.error('Run: npm run cleanServices -- --confirm');
  process.exitCode = 1;
} else {
  const client = await pool.raw.connect();
  try {
    const orderItems = await client.query('SELECT COUNT(*)::int AS count FROM order_items');
    if (Number(orderItems.rows[0]?.count || 0) > 0) {
      throw new Error('Service bookings exist. Cleanup stopped to preserve booking history.');
    }

    await client.query('BEGIN');
    const services = await client.query('DELETE FROM services');
    const subcategories = await client.query('DELETE FROM subcategories');
    const categories = await client.query('DELETE FROM categories');
    await client.query('COMMIT');

    console.log(JSON.stringify({
      deleted: {
        services: services.rowCount,
        subcategories: subcategories.rowCount,
        categories: categories.rowCount,
      },
      untouched: ['shop_products', 'shop_orders', 'shop_order_items'],
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Service cleanup failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
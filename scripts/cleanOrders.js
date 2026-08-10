import pool from '../config/db.js';
import AppControl from '../models/AppControl.js';

const confirmed = process.argv.includes('--confirm');

if (!confirmed) {
  console.error('Refusing to delete all orders without --confirm.');
  console.error('Run: npm run cleanOrders -- --confirm');
  process.exitCode = 1;
} else {
  await AppControl.ensureSchema();
  const client = await pool.raw.connect();
  try {
    await client.query('BEGIN');

    // Delete child rows first. This works whether the deployment has foreign
    // keys with cascading deletes or an older schema without them.
    const serviceReviews = await client.query('DELETE FROM service_reviews');
    const paymentReceipts = await client.query('DELETE FROM payment_receipts');
    const orderItems = await client.query('DELETE FROM order_items');
    const serviceOrders = await client.query('DELETE FROM orders');
    const shopOrderItems = await client.query('DELETE FROM shop_order_items');
    const shopOrders = await client.query('DELETE FROM shop_orders');

    await client.query('COMMIT');
    console.log(JSON.stringify({
      deleted: {
        serviceReviews: serviceReviews.rowCount,
        paymentReceipts: paymentReceipts.rowCount,
        orderItems: orderItems.rowCount,
        serviceOrders: serviceOrders.rowCount,
        shopOrderItems: shopOrderItems.rowCount,
        shopOrders: shopOrders.rowCount,
      },
      untouched: ['users', 'services', 'categories', 'subcategories', 'shop_products'],
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Order cleanup failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
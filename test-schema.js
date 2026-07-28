import pool from './config/db.js';

async function run() {
  const [services] = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'services'`);
  const [shopProducts] = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shop_products'`);
  
  console.log('Services Columns:', services.map(r => r.column_name));
  console.log('Shop Products Columns:', shopProducts.map(r => r.column_name));
  
  await pool.end();
}
run();

import pool from '../config/db.js';

async function checkCounts() {
  try {
    const [all] = await pool.query('SELECT COUNT(*) as total FROM shop_products');
    const [active] = await pool.query("SELECT COUNT(*) as total FROM shop_products WHERE is_active::text IN ('1', 'true', 't')");
    const [inactive] = await pool.query("SELECT COUNT(*) as total FROM shop_products WHERE is_active::text NOT IN ('1', 'true', 't') OR is_active IS NULL");
    
    console.log('Total products:', all[0].total);
    console.log('Active products:', active[0].total);
    console.log('Inactive products:', inactive[0].total);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCounts();

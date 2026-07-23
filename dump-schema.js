import pool from './config/db.js';
async function run() {
  const [rows] = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'complaints'");
  console.log(rows);
  process.exit();
}
run();

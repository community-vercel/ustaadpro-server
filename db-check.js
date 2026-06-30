import AppControl from './models/AppControl.js';
import pool from './config/db.js';

async function main() {
  try {
    console.log('Running AppControl.ensureSchema()...');
    await AppControl.ensureSchema();
    console.log('ensureSchema finished successfully.');
    
    const [rows] = await pool.query('SELECT id, status, cancel_reason FROM orders LIMIT 2');
    console.log('Success querying orders table! Rows:', rows);
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await pool.end();
  }
}

main();

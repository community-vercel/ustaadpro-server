import pool from '../config/db.js';

const duplicatePairs = [
  ['paint-nippon-timber-finish-c-w-lacquer-gallon', 'nippon-timber-finish-c-w-lacquer-gallon'],
  ['paint-nippon-timber-finish-c-w-lacquer-quarter', 'nippon-timber-finish-c-w-lacquer-quarter'],
  ['paint-nippon-timber-finish-matt-lacquer-gallon', 'nippon-timber-finish-matt-lacquer-gallon'],
  ['paint-nippon-timber-finish-matt-lacquer-quarter', 'nippon-timber-finish-matt-lacquer-quarter'],
];

async function cleanup() {
  const client = await pool.raw.connect();
  try {
    await client.query('BEGIN');
    for (const [duplicateId, canonicalId] of duplicatePairs) {
      const canonical = await client.query('SELECT id FROM shop_products WHERE id = $1', [canonicalId]);
      if (!canonical.rowCount) throw new Error(`Canonical product missing: ${canonicalId}`);
      const duplicate = await client.query('SELECT id FROM shop_products WHERE id = $1', [duplicateId]);
      if (!duplicate.rowCount) {
        console.log(`Already clean: ${duplicateId}`);
        continue;
      }
      await client.query('UPDATE shop_order_items SET product_id = $1 WHERE product_id = $2', [canonicalId, duplicateId]);
      await client.query('DELETE FROM shop_products WHERE id = $1', [duplicateId]);
      console.log(`Removed duplicate ${duplicateId}; kept ${canonicalId}.`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(error => {
  console.error('Shop duplicate cleanup failed:', error.message);
  process.exitCode = 1;
});
/**
 * One-time cleanup: remove stale/duplicate categories from old seeds
 * and migrate their stray services into the canonical categories.
 *
 * Canonical set (from newUpdatedServices seed):
 *   electrician, home-services, plumber, painter, carpenter,
 *   welder, cctv, hvac, office-maintenance
 *
 * Also kept: subscriptions, ac-services (legitimate old categories with content)
 */

import pool from '../config/db.js';

const migrations = [
  // { staleId, canonicalId } — move services then delete stale category
  {staleId: 'plumbers',        canonicalId: 'plumber'},
  {staleId: 'painters',        canonicalId: 'painter'},
  {staleId: 'welder-fabricator', canonicalId: 'welder'},
  {staleId: 'home-cleaning',   canonicalId: 'home-services'},
  {staleId: 'home',            canonicalId: 'home-services'},   // 0 services, just delete
  {staleId: 'cleaning',        canonicalId: 'home-services'},   // 0 services, just delete
  {staleId: 'dry-cleaning',    canonicalId: null},              // 0 services, just delete
];

async function run() {
  for (const {staleId, canonicalId} of migrations) {
    if (canonicalId) {
      const [moved] = await pool.query(
        'UPDATE services SET category_id = ? WHERE category_id = ?',
        [canonicalId, staleId],
      );
      if (moved.affectedRows > 0) {
        console.log(`  Moved ${moved.affectedRows} service(s) from "${staleId}" → "${canonicalId}"`);
      }
    }
    // Delete any subcategories under the stale category
    await pool.query('DELETE FROM subcategories WHERE category_id = ?', [staleId]);
    const [del] = await pool.query('DELETE FROM categories WHERE id = ?', [staleId]);
    if (del.affectedRows > 0) {
      console.log(`  Deleted stale category: ${staleId}`);
    }
  }

  // Verify
  const [cats] = await pool.query(
    'SELECT c.id, c.title, COUNT(s.id) as services FROM categories c LEFT JOIN services s ON s.category_id = c.id GROUP BY c.id, c.title ORDER BY c.title',
  );
  console.log('\nFinal categories:');
  cats.forEach(c => console.log(`  ${c.title} (${c.id}): ${c.services} services`));
}

run()
  .then(() => { console.log('\nCleanup complete.'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

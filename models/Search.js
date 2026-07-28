import pool from '../config/db.js';

class Search {
  static async globalSearch({ query, limit = 30, offset = 0 }) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { results: [], total: 0 };
    }

    const searchTerm = query.trim();
    const partialTerm = `%${searchTerm}%`;

    // We use a UNION ALL query to search both tables.
    // For sorting, PostgreSQL treats boolean values such that true > false.
    // So by ordering DESC, matches (true) come before non-matches (false).
    
    // In PostgreSQL, to order by a boolean expression, we cast it to integer or just order by the boolean DESC.
    // We add exact_match and partial_title_match as columns to the SELECT to make ordering easy and stable.

    const sql = `
      WITH search_results AS (
        SELECT 
          'service' AS result_type,
          id::text,
          title,
          description,
          price,
          original_price,
          image_url,
          NULL AS category,
          NULL AS stock,
          (title ILIKE $1) AS exact_match,
          (title ILIKE $2) AS partial_title_match
        FROM services
        WHERE title ILIKE $2 OR description ILIKE $2

        UNION ALL

        SELECT 
          'shop_product' AS result_type,
          id::text,
          title,
          description,
          price,
          original_price,
          image_url,
          category,
          stock,
          (title ILIKE $1) AS exact_match,
          (title ILIKE $2) AS partial_title_match
        FROM shop_products
        WHERE is_active::text IN ('1', 'true', 't') 
          AND (title ILIKE $2 OR description ILIKE $2)
      )
      SELECT * FROM search_results
      ORDER BY 
        exact_match DESC, 
        partial_title_match DESC, 
        title ASC
      LIMIT $3 OFFSET $4
    `;

    const countSql = `
      SELECT sum(c) as total FROM (
        SELECT count(*) as c FROM services WHERE title ILIKE $1 OR description ILIKE $1
        UNION ALL
        SELECT count(*) as c FROM shop_products WHERE is_active::text IN ('1', 'true', 't') AND (title ILIKE $1 OR description ILIKE $1)
      ) t
    `;

    const params = [searchTerm, partialTerm, limit, offset];
    const countParams = [partialTerm];

    try {
      const [[countResult], [results]] = await Promise.all([
        pool.query(countSql, countParams),
        pool.query(sql, params)
      ]);

      const total = countResult && countResult[0] ? Number(countResult[0].total || 0) : 0;
      
      return {
        results: results.map(row => ({
          resultType: row.result_type,
          id: row.id,
          title: row.title,
          description: row.description,
          price: Number(row.price || 0),
          originalPrice: Number(row.original_price || 0),
          imageUrl: row.image_url,
          category: row.category,
          stock: row.stock !== null ? Number(row.stock) : null,
          exactMatch: row.exact_match,
          partialTitleMatch: row.partial_title_match,
        })),
        total
      };
    } catch (error) {
      console.error('Search model error:', error);
      throw error;
    }
  }
}

export default Search;

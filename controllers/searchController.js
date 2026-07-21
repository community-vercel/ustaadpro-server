import Search from '../models/Search.js';

export const globalSearch = async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 30)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    if (!query.trim()) {
      return res.json({
        results: [],
        limit,
        offset,
        total: 0,
        hasMore: false,
      });
    }

    const { results, total } = await Search.globalSearch({ query, limit, offset });

    res.json({
      results,
      limit,
      offset,
      total,
      hasMore: offset + results.length < total,
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ message: 'Internal server error during search' });
  }
};

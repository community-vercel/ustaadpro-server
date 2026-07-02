export const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // PostgreSQL specific errors
    if (err.code === '23505') {
        return res.status(409).json({
            error: 'Duplicate entry found',
            detail: err.detail
        });
    }

    if (err.code === '23503') {
        return res.status(400).json({
            error: 'Invalid reference',
            detail: err.detail
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack 
        })
    });
};
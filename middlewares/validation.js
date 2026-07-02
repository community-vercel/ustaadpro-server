export const validateServiceInput = (req, res, next) => {
    const { category, name, msg } = req.body;
    const errors = [];

    if (!category || !category.trim()) {
        errors.push('Category is required');
    }
    if (!name || !name.trim()) {
        errors.push('Service name is required');
    }
    if (!msg || !msg.trim()) {
        errors.push('Message is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

export const validateStatusUpdate = (req, res, next) => {
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const { status } = req.body;

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    next();
};
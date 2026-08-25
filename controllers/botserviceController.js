import Service from '../models/Service.js';
import Category from '../models/Category.js';
import pool from '../config/db.js';

function formatBotService(svc, categoryTitle) {
    const workPrices = Array.isArray(svc.workPrices) ? svc.workPrices : [];
    const optionsObj = {};

    if (workPrices.length > 0) {
        workPrices.forEach((wp, wpIdx) => {
            const optKey = String(wpIdx + 1);
            optionsObj[optKey] = `${wp.title} (Rs.${Number(wp.price || 0)})`;
        });
    } else {
        optionsObj['1'] = `${svc.title} (Rs.${Number(svc.price || 0)})`;
    }

    let messageOutline = `*${svc.title} Rates & Options*\n\n`;
    if (workPrices.length > 0) {
        messageOutline += workPrices
            .map((wp, wpIdx) => `${wpIdx + 1}. ${wp.title} - Rs.${Number(wp.price || 0)}${wp.description ? `\n   _${wp.description}_` : ''}`)
            .join('\n\n');
    } else {
        messageOutline += `1. Standard Visit - Rs.${Number(svc.price || 0)}`;
    }

    return {
        id: svc.id,
        _id: svc.id,
        category: categoryTitle || svc.categoryId,
        categoryId: svc.categoryId,
        name: svc.title,
        msg: messageOutline,
        options: optionsObj,
        active: svc.isActive !== false,
        price: Number(svc.price || 0),
        workPrices: workPrices,
    };
}

// @desc    Get all bot services (derived from real DB services)
// @route   GET /api/bot/services
export const getAllServices = async (req, res, next) => {
    try {
        const [categories, services] = await Promise.all([
            Category.getAll(),
            Service.getAll(),
        ]);

        const categoryTitleMap = new Map();
        categories.forEach(c => {
            categoryTitleMap.set(c.id, c.title);
        });

        const formattedServices = services.map(svc =>
            formatBotService(svc, categoryTitleMap.get(svc.categoryId) || svc.categoryId)
        );

        res.json(formattedServices);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single bot service
// @route   GET /api/bot/services/:id
export const getServiceById = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const categories = await Category.getAll();
        const category = categories.find(c => c.id === service.categoryId);

        res.json(formatBotService(service, category?.title));
    } catch (error) {
        next(error);
    }
};

// @desc    Create service
// @route   POST /api/bot/services
export const createService = async (req, res, next) => {
    try {
        const { category, categoryId, name, title, description, price, options, optionsArray, workPrices } = req.body;
        const svcTitle = name || title;
        if (!svcTitle) {
            return res.status(400).json({ error: 'Service name/title is required' });
        }

        // Resolve categoryId
        let resolvedCategoryId = categoryId;
        if (!resolvedCategoryId && category) {
            const categories = await Category.getAll();
            const match = categories.find(c =>
                c.id === category ||
                c.title.toLowerCase() === category.toLowerCase()
            );
            resolvedCategoryId = match ? match.id : category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        const id = (title || name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        let normalizedWorkPrices = [];
        if (Array.isArray(workPrices) && workPrices.length > 0) {
            normalizedWorkPrices = workPrices;
        } else if (Array.isArray(optionsArray) && optionsArray.length > 0) {
            normalizedWorkPrices = optionsArray.map((opt, i) => {
                const label = opt.label || opt;
                const priceMatch = String(label).match(/Rs\.?\s*(\d+)/i);
                const itemPrice = priceMatch ? Number(priceMatch[1]) : (price || 500);
                const itemTitle = String(label).replace(/\(Rs\.?\s*\d+\)/i, '').trim();
                return { title: itemTitle || `Option ${i + 1}`, price: itemPrice, sortOrder: i };
            });
        } else if (options && typeof options === 'object') {
            normalizedWorkPrices = Object.entries(options).map(([key, label], i) => {
                const priceMatch = String(label).match(/Rs\.?\s*(\d+)/i);
                const itemPrice = priceMatch ? Number(priceMatch[1]) : (price || 500);
                const itemTitle = String(label).replace(/\(Rs\.?\s*\d+\)/i, '').trim();
                return { title: itemTitle || `Option ${key}`, price: itemPrice, sortOrder: i };
            });
        }

        await Service.create({
            id,
            categoryId: resolvedCategoryId || 'home-cleaning',
            title: svcTitle,
            description: description || svcTitle,
            price: price || (normalizedWorkPrices[0]?.price || 500),
            workPrices: normalizedWorkPrices,
        });

        const created = await Service.findById(id);
        res.status(201).json(formatBotService(created, category));
    } catch (error) {
        next(error);
    }
};

// @desc    Update service
// @route   PUT /api/bot/services/:id
export const updateService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await Service.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const { category, categoryId, name, title, description, price, optionsArray, workPrices, active } = req.body;
        const svcTitle = name || title || existing.title;

        let normalizedWorkPrices = existing.workPrices || [];
        if (Array.isArray(workPrices) && workPrices.length > 0) {
            normalizedWorkPrices = workPrices;
        } else if (Array.isArray(optionsArray) && optionsArray.length > 0) {
            normalizedWorkPrices = optionsArray.map((opt, i) => {
                const label = opt.label || opt;
                const priceMatch = String(label).match(/Rs\.?\s*(\d+)/i);
                const itemPrice = priceMatch ? Number(priceMatch[1]) : (price || existing.price || 500);
                const itemTitle = String(label).replace(/\(Rs\.?\s*\d+\)/i, '').trim();
                return { title: itemTitle || `Option ${i + 1}`, price: itemPrice, sortOrder: i };
            });
        }

        await Service.update(id, {
            ...existing,
            title: svcTitle,
            description: description || existing.description,
            categoryId: categoryId || existing.categoryId,
            price: price || existing.price,
            workPrices: normalizedWorkPrices,
        });

        if (typeof active === 'boolean') {
            await pool.query('UPDATE services SET is_active = ? WHERE id = ?', [active, id]);
        }

        const updated = await Service.findById(id);
        res.json(formatBotService(updated, category));
    } catch (error) {
        next(error);
    }
};

// @desc    Delete service
// @route   DELETE /api/bot/services/:id
export const deleteService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await Service.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Service not found' });
        }

        await pool.query('UPDATE services SET is_active = FALSE WHERE id = ?', [id]);
        res.json({ message: 'Service deactivated successfully', id });
    } catch (error) {
        next(error);
    }
};
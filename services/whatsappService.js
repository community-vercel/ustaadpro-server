import pool from '../config/db.js';
import Category from '../models/Category.js';
import Service from '../models/Service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC DATABASE-DRIVEN WHATSAPP SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

function normalize(name) {
    return String(name || '').trim().toLowerCase();
}

/**
 * Fetch all active categories from the database.
 * Returns array of category display titles in configured sort order.
 */
export async function getCategories() {
    try {
        const categories = await Category.getAll();
        if (categories && categories.length > 0) {
            return categories.map(c => c.title);
        }
    } catch (err) {
        console.error('Error fetching categories for bot:', err.message);
    }
    return ['AC Services', 'Electrician', 'Plumber', 'Home Cleaning', 'Dry Cleaning', 'Painters', 'Carpenter', 'Welder & Fabricator', 'CCTV Services', 'Office Maintenance'];
}

/**
 * Find the matching database category object given a title or ID.
 */
async function findCategoryRecord(categoryIdentifier) {
    const norm = normalize(categoryIdentifier);
    const [rows] = await pool.query(
        'SELECT * FROM categories WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY sort_order ASC, title ASC'
    );

    return rows.find(c =>
        normalize(c.id) === norm ||
        normalize(c.title) === norm ||
        normalize(c.title).includes(norm) ||
        norm.includes(normalize(c.title))
    ) || null;
}

/**
 * Fetch all active services for a given category from the database.
 * Formats each service with its dynamic work prices and WhatsApp options menu.
 * Returns an indexed object: { "1": { name, serviceId, categoryId, msg, options }, "2": ... }
 */
export async function getServicesForCategory(categoryIdentifier) {
    const servicesMap = {};

    try {
        const categoryRecord = await findCategoryRecord(categoryIdentifier);
        const categoryId = categoryRecord ? categoryRecord.id : categoryIdentifier;
        const categoryTitle = categoryRecord ? categoryRecord.title : categoryIdentifier;

        const dbServices = await Service.getAll({ categoryId });

        // If no direct services by categoryId, try searching services matching categoryTitle
        let serviceList = dbServices;
        if (!serviceList || serviceList.length === 0) {
            const allServices = await Service.getAll();
            const normTitle = normalize(categoryTitle);
            serviceList = allServices.filter(s =>
                normalize(s.categoryId) === normalize(categoryId) ||
                normalize(s.categoryId) === normTitle ||
                normalize(s.title).includes(normTitle)
            );
        }

        serviceList.forEach((svc, index) => {
            const key = String(index + 1);
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

            // Build human-friendly message outline for WhatsApp
            let messageOutline = `*${svc.title} Rates & Options*\n\n`;
            if (workPrices.length > 0) {
                messageOutline += workPrices
                    .map((wp, wpIdx) => `${wpIdx + 1}. ${wp.title} - Rs.${Number(wp.price || 0)}${wp.description ? `\n   _${wp.description}_` : ''}`)
                    .join('\n\n');
            } else {
                messageOutline += `1. Standard Visit - Rs.${Number(svc.price || 0)}`;
            }

            servicesMap[key] = {
                id: svc.id,
                serviceId: svc.id,
                categoryId: svc.categoryId,
                name: svc.title,
                msg: messageOutline,
                options: optionsObj,
            };
        });
    } catch (err) {
        console.error('Error fetching services for category:', categoryIdentifier, err.message);
    }

    return servicesMap;
}

/**
 * Resolve user input (number or text) to the corresponding category name.
 */
export function resolveCategory(categories, input) {
    const trimmed = String(input || '').trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
        const index = parseInt(trimmed, 10) - 1;
        return categories[index] || null;
    }

    const norm = normalize(trimmed);
    return categories.find(c => {
        const normC = normalize(c);
        return normC === norm || normC.includes(norm) || norm.includes(normC);
    }) || null;
}

/**
 * Build WhatsApp menu text for categories list.
 */
export function buildCategoryMenu(categories) {
    return categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n');
}

/**
 * Build WhatsApp menu text for services under a category.
 */
export function buildServicesMenu(services) {
    return Object.entries(services)
        .map(([key, svc]) => `${key}. ${svc.name}`)
        .join('\n');
}

/**
 * Build WhatsApp menu text for options/rates of a service.
 */
export function buildOptionsMenu(serviceData) {
    if (!serviceData || !serviceData.options) return '';
    return Object.entries(serviceData.options)
        .map(([key, value]) => `${key}. ${value}`)
        .join('\n');
}
import Service from '../models/botService.js';

// ═══════════════════════════════════════
// HARDCODED SERVICES (FALLBACK)
// ═══════════════════════════════════════
export const HARDCODED_HOME = {
    "1": { name: "AC Service", msg: `*AC Service Rates & Options*\n\n1. AC Dismounting Per AC (1 to 2.5 tons) - Rs.1200\n2. AC General Service Per AC (1 to 2.5 tons) - Rs.2000\n3. AC Installation with 10 Feet pipe (1 to 2.5 tons) - Rs.3000`, options: { "1": "AC Dismounting (Rs.1200)", "2": "AC General Service (Rs.2000)", "3": "AC Installation (Rs.3000)" } },
    "2": { name: "Carpenter", msg: `*Carpenter Service*\n\n1. Visit & Inspection - Rs.500\n2. Door Installation - From Rs.1000\n3. Furniture Repair - Rs.500`, options: { "1": "Visit & Inspection (Rs.500)", "2": "Door Installation (From Rs.1000)", "3": "Furniture Repair (Rs.500)" } },
    "3": { name: "Electrician", msg: `*Electrician Service*\n\n1. Ceiling Fan Installation - Rs.800\n2. Ceiling Fan Repairing - Rs.500\n3. Exhaust Fan Installation - Rs.600\n4. House Electric Work Visit - Rs.800`, options: { "1": "Fan Installation (Rs.800)", "2": "Fan Repair (Rs.500)", "3": "Exhaust Fan (Rs.600)", "4": "Electric Work Visit (Rs.800)" } },
    "4": { name: "Geyser", msg: `*Geyser Service*\n\n1. Gas Geyser Dismounting - Rs.1200\n2. Gas Geyser Installation - From Rs.2800\n3. Gas Geyser Service - From Rs.2200\n4. Electric Geyser Dismounting - Rs.800\n5. Electric Geyser Installation - From Rs.2800\n6. Electric Geyser Service - From Rs.2200`, options: { "1": "Gas Geyser Dismounting (Rs.1200)", "2": "Gas Geyser Installation (Rs.2800)", "3": "Gas Geyser Service (Rs.2200)", "4": "Electric Geyser Dismounting (Rs.800)", "5": "Electric Geyser Installation (Rs.2800)", "6": "Electric Geyser Service (Rs.2200)" } },
    "5": { name: "Handyman", msg: `*Handyman Service*\n\n1. Curtain Rod Installation - Rs.600\n2. Shelf Hanging - Rs.700`, options: { "1": "Curtain Rod (Rs.600)", "2": "Shelf Hanging (Rs.700)" } },
    "6": { name: "Home Appliances", msg: `*Home Appliances Service*\n\n1. Washing Machine Repair - Rs.800\n2. Kitchen Hood Repair - Rs.800\n3. Oven Range Service - Rs.1600`, options: { "1": "Washing Machine (Rs.800)", "2": "Kitchen Hood (Rs.800)", "3": "Oven Range (Rs.1600)" } },
    "7": { name: "Painter", msg: `*Painter Service*\n\n1. Gray Structure Paint - Rs.500\n2. Indoor Paint - Rs.500\n3. Outdoor Paint - Rs.500`, options: { "1": "Gray Structure (Rs.500)", "2": "Indoor Paint (Rs.500)", "3": "Outdoor Paint (Rs.500)" } },
    "8": { name: "Plumber", msg: `*Plumber Service*\n\n1. Bath Shower Installation - Rs.1500\n2. Commode Installation - Rs.2500\n3. Commode Tank Repair - Rs.1200\n4. Gas Pipe Wiring - Rs.800\n5. House Plumbing Visit - Rs.800`, options: { "1": "Bath Shower (Rs.1500)", "2": "Commode (Rs.2500)", "3": "Tank Repair (Rs.1200)", "4": "Gas Pipe (Rs.800)", "5": "Plumbing Visit (Rs.800)" } }
};

export const HARDCODED_CLEANING = {
    "1": { name: "Sofa Cleaning", msg: `*Sofa Cleaning*\n\n1. 10 Seater - Rs.3250\n2. 5 Seater - Rs.1600\n3. 6 Seater - Rs.1900\n4. Sofa Cum Bed - Rs.1400`, options: { "1": "10 Seater (Rs.3250)", "2": "5 Seater (Rs.1600)", "3": "6 Seater (Rs.1900)", "4": "Sofa Cum Bed (Rs.1400)" } },
    "2": { name: "Plastic Water Tank Cleaning", msg: `*Tank Cleaning*\n\n1. 150-300 Gallons - Rs.1600\n2. 350-500 Gallons - Rs.2000\n3. 550-1000 Gallons - Rs.2500`, options: { "1": "150-300G (Rs.1600)", "2": "350-500G (Rs.2000)", "3": "550-1000G (Rs.2500)" } },
    "3": { name: "Deep Cleaning", msg: `*Deep Cleaning*\n\n1. Full House 11M-3K Survey - Rs.500\n2. Full House 3-10M Survey - Rs.500\n3. Kitchen - From Rs.2800\n4. Washroom - From Rs.2400`, options: { "1": "11M-3K Survey (Rs.500)", "2": "3-10M Survey (Rs.500)", "3": "Kitchen (Rs.2800)", "4": "Washroom (Rs.2400)" } },
    "4": { name: "Curtain Cleaning", msg: `*Curtain Cleaning*\n\n1. Blind Per Blind - Rs.1000\n2. Curtain Per Curtain - Rs.1000`, options: { "1": "Blind (Rs.1000)", "2": "Curtain (Rs.1000)" } },
    "5": { name: "Chair Cleaning", msg: `*Chair Cleaning*\n\n1. 10 Seats - Rs.2600\n2. 12 Seats - Rs.3100\n3. 8 Seats - Rs.2100`, options: { "1": "10 Seats (Rs.2600)", "2": "12 Seats (Rs.3100)", "3": "8 Seats (Rs.2100)" } },
    "6": { name: "Cement Water Tank Cleaning", msg: `*Cement Tank*\n\n1. Roof 3/5-5/5ft - Rs.2200\n2. Roof 6/6-8/8ft - Rs.3000\n3. Underground 3/5-5/5ft - Rs.3000\n4. Underground 6/6-8/8ft - Rs.3500`, options: { "1": "Roof 3/5ft (Rs.2200)", "2": "Roof 6/6ft (Rs.3000)", "3": "Under 3/5ft (Rs.3000)", "4": "Under 6/6ft (Rs.3500)" } },
    "7": { name: "Bed/Mattress Cleaning", msg: `*Bed/Mattress*\n\n1. Bed Visit - Rs.500\n2. Double Mattress - Rs.2000\n3. Single Mattress - Rs.1600`, options: { "1": "Bed Visit (Rs.500)", "2": "Double Mattress (Rs.2000)", "3": "Single Mattress (Rs.1600)" } },
    "8": { name: "Carpet Cleaning", msg: `*Carpet Cleaning*\n\n1. Carpet Per SQFT - Rs.20\n2. Rug Per SQFT - Rs.25`, options: { "1": "Carpet (Rs.20/SQFT)", "2": "Rug (Rs.25/SQFT)" } }
};

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function normalize(name) {
    return String(name || '').trim().toLowerCase();
}

function cloneServices(services) {
    return JSON.parse(JSON.stringify(services));
}

// ═══════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════
export async function getCategories() {
    const defaults = ['Home Service', 'Cleaning Service'];
    try {
        const dbCategories = await Service.getCategories();
        const merged = [...defaults];
        for (const cat of dbCategories) {
            if (!merged.some(c => normalize(c) === normalize(cat))) {
                merged.push(cat);
            }
        }
        return merged;
    } catch {
        return defaults;
    }
}

// ═══════════════════════════════════════
// SERVICES FOR CATEGORY
// ═══════════════════════════════════════
export async function getServicesForCategory(category) {
    const norm = normalize(category);
    let base = {};
    
    if (norm === 'home service') base = cloneServices(HARDCODED_HOME);
    else if (norm === 'cleaning service') base = cloneServices(HARDCODED_CLEANING);
    
    try {
        const dbServices = await Service.findByCategory(category);
        for (const svc of dbServices) {
            const opts = typeof svc.options === 'string' ? JSON.parse(svc.options) : svc.options;
            const optionsObj = {};
            if (Array.isArray(opts)) {
                opts.forEach((o, i) => { optionsObj[o.key || String(i+1)] = o.label; });
            } else if (opts) {
                Object.assign(optionsObj, opts);
            }
            const svcData = { name: svc.name, msg: svc.msg, options: optionsObj };
            const existingKey = Object.entries(base).find(([,v]) => normalize(v.name) === normalize(svc.name));
            if (existingKey) base[existingKey[0]] = svcData;
            else {
                const keys = Object.keys(base).map(Number).filter(n => !isNaN(n));
                base[String((keys.length > 0 ? Math.max(...keys) : 0) + 1)] = svcData;
            }
        }
    } catch (e) {
        console.error("Load services error:", e.message);
    }
    return base;
}

// ═══════════════════════════════════════
// RESOLVE CATEGORY (by number or name)
// ═══════════════════════════════════════
export function resolveCategory(categories, input) {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
        return categories[parseInt(trimmed) - 1] || null;
    }
    const norm = normalize(trimmed);
    return categories.find(c => 
        normalize(c) === norm || 
        normalize(c).includes(norm) || 
        norm.includes(normalize(c))
    ) || null;
}

// ═══════════════════════════════════════
// MENU BUILDERS
// ═══════════════════════════════════════
export function buildCategoryMenu(categories) {
    return categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n');
}

export function buildServicesMenu(services) {
    return Object.entries(services)
        .map(([key, svc]) => `${key}. ${svc.name}`)
        .join('\n');
}

export function buildOptionsMenu(serviceData) {
    return Object.entries(serviceData.options)
        .map(([key, value]) => `${key}. ${value}`)
        .join('\n');
}
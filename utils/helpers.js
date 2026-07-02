// Build options menu for WhatsApp
export const buildOptionsMenu = (options) => {
    if (!options || options.length === 0) return '';
    
    return options
        .map(opt => `${opt.key}. ${opt.label}`)
        .join('\n');
};

// Build confirmation preview
export const buildConfirmationPreview = (session) => {
    return (
        `*Booking Summary*\n\n` +
        `================================\n` +
        `Category:   ${session.orderDetails.mainCategory}\n` +
        `Service:    ${session.orderDetails.serviceType}\n` +
        `Detail:     ${session.orderDetails.subService}\n` +
        `Date:       ${session.orderDetails.date}\n` +
        `Time:       ${session.orderDetails.time}\n` +
        `Address:    ${session.orderDetails.address}\n` +
        `================================\n\n` +
        `Confirm this booking?\n\n` +
        `1. ✅ Confirm Order\n` +
        `2. 📅 Change Date/Time\n` +
        `3. 📍 Change Address\n` +
        `4. ❌ Cancel & Restart`
    );
};

// Escape HTML for frontend
export const escapeHtml = (value) => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
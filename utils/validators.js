// Date validation function for WhatsApp bot
export const validateAndParseDate = (rawInput) => {
    const inputLower = rawInput.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const keywordMap = {
        'day after tomorrow': 2, 'aglay kal': 2, 'parson': 2, 'parso': 2,
        'tomorrow': 1, 'kal': 1, 'today': 0, 'aaj': 0
    };

    let resolvedDate = null;

    for (const [keyword, daysToAdd] of Object.entries(keywordMap)) {
        if (inputLower.includes(keyword)) {
            resolvedDate = new Date(today);
            resolvedDate.setDate(resolvedDate.getDate() + daysToAdd);
            break;
        }
    }

    if (!resolvedDate) {
        const monthNames = {
            'january': 0, 'jan': 0, 'february': 1, 'feb': 1,
            'march': 2, 'mar': 2, 'april': 3, 'apr': 3, 'may': 4,
            'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
            'august': 7, 'aug': 7, 'september': 8, 'sep': 8, 'sept': 8,
            'october': 9, 'oct': 9, 'november': 10, 'nov': 10,
            'december': 11, 'dec': 11
        };

        let parsedDay = null, parsedMonth = null;
        let parsedYear = today.getFullYear();

        const formatA = inputLower.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*[,\-]?\s*([a-z]+)\s*,?\s*(\d{4})?/);
        if (formatA) {
            parsedDay = parseInt(formatA[1]);
            parsedMonth = monthNames[formatA[2]];
            if (formatA[3]) parsedYear = parseInt(formatA[3]);
        }

        if (parsedDay === null || parsedMonth === undefined) {
            return { error: true, message: 'Invalid date format! Please use: 15 June, 15/06/2025, or Tomorrow' };
        }

        resolvedDate = new Date(parsedYear, parsedMonth, parsedDay);
    }

    if (resolvedDate < today) {
        return { error: true, message: 'Cannot book for past dates. Please enter a future date.' };
    }

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    if (resolvedDate > maxDate) {
        return { error: true, message: 'Booking only available within next 30 days.' };
    }

    return { error: false, date: resolvedDate, formatted: resolvedDate.toLocaleDateString('en-PK') };
};

// Time validation
export const validateTime = (timeInput) => {
    const timeLower = timeInput.toLowerCase().replace(/\s+/g, '');

    if (!timeLower.includes('am') && !timeLower.includes('pm')) {
        return { error: true, message: 'Please specify AM or PM. Example: 10:00 AM' };
    }

    const hourMatch = timeLower.match(/(\d+)/);
    if (!hourMatch) {
        return { error: true, message: 'Invalid time format. Example: 10:00 AM' };
    }

    const hour = parseInt(hourMatch[1]);
    const isAM = timeLower.includes('am');
    const isPM = timeLower.includes('pm');

    if (isAM && (hour < 8 || hour > 11)) {
        return { error: true, message: 'Services available from 8:00 AM to 6:00 PM only.' };
    }
    if (isPM && hour !== 12 && (hour < 1 || hour > 6)) {
        return { error: true, message: 'Services available from 8:00 AM to 6:00 PM only.' };
    }

    return { error: false };
};

// Address validation - Dynamic, no hardcoded city list
export const validateAddress = (addressText) => {
    const originalText = addressText.trim();
    const addressLower = originalText.toLowerCase();

    // Accept Google Maps links immediately
    if (
        addressLower.includes('maps.google.com') ||
        addressLower.includes('goo.gl/maps') ||
        addressLower.includes('maps.app.goo.gl') ||
        addressLower.includes('maps.google.co')
    ) {
        return { error: false };
    }

    const words = originalText.split(/[\s,]+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // CHECK 1: Minimum 20 characters for a complete address
    if (originalText.length < 20) {
        return {
            error: true,
            message:
                `Address Too Short!\n\n` +
                `"${originalText}" is not enough for our technician to reach you.\n\n` +
                `Please include ALL of these:\n` +
                `1. House / Flat / Shop Number\n` +
                `2. Street / Gali Number\n` +
                `3. Area / Colony / Mohallah Name\n` +
                `4. City Name\n\n` +
                `Example:\nHouse No 12, Street 5, Jinnah Colony, Burewala\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // CHECK 2: Only numbers
    if (/^\d+$/.test(originalText)) {
        return {
            error: true,
            message:
                `Numbers Only Are Not An Address!\n\n` +
                `Please type complete address with House No, Street, Area and City.\n\n` +
                `Example:\nHouse No ${originalText}, Street 5, Jinnah Colony, Burewala\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // CHECK 3: No valid letters (only special chars/gibberish)
    const hasValidLetters = /[a-zA-Z\u0600-\u06FF]/.test(originalText);
    if (!hasValidLetters) {
        return {
            error: true,
            message:
                `Address Not Understood!\n\n` +
                `Please type your address in proper words.\n\n` +
                `Example:\nHouse No 5, Street 10, Model Town, Lahore\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // CHECK 4: Must have at least 4 words
    if (wordCount < 4) {
        return {
            error: true,
            message:
                `Address Incomplete! (Only ${wordCount} word${wordCount > 1 ? 's' : ''})\n\n` +
                `"${originalText}" is not a complete address.\n\n` +
                `Please include ALL of these:\n` +
                `1. House / Flat / Shop Number\n` +
                `2. Street / Gali Number\n` +
                `3. Area / Colony / Mohallah Name\n` +
                `4. City Name\n\n` +
                `Example:\nHouse No 12, Street 5, Jinnah Colony, Burewala\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // CHECK 5: Must have a number (house/shop number)
    const hasNumber = /\d/.test(originalText);
    if (!hasNumber) {
        return {
            error: true,
            message:
                `House/Shop Number Missing!\n\n` +
                `"${originalText}" does not contain any house or shop number.\n\n` +
                `Please include:\n` +
                `- House Number (e.g., House 15, Flat 4B)\n` +
                `- Or Shop Number (e.g., Shop 8)\n\n` +
                `Example:\nHouse 15, ${originalText}\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // CHECK 6: Must have street/gali/area reference
    const hasStreetOrArea = /\b(street|gali|road|avenue|lane|block|phase|colony|mohallah|pura|town|society|chowk|sector|market|plaza|nagar|nagar|scheme|model town|defence|dhoke|muhalla|mohalla|basti|abad|pura|dera)\b/i.test(originalText);
    if (!hasStreetOrArea) {
        // Check if there's a descriptive middle part (4+ words mein kuch to hoga)
        // Agar 4 words hain aur koi street/area indicator nahi, to incomplete hai
        if (wordCount <= 5) {
            return {
                error: true,
                message:
                    `Street/Area Name Missing!\n\n` +
                    `"${originalText}" seems incomplete.\n\n` +
                    `Please add:\n` +
                    `- Street/Gali Number\n` +
                    `- Area/Colony/Mohallah Name\n\n` +
                    `Example:\nHouse 20, Gali 5, Jinnah Colony, Burewala\n\n` +
                    `Best: Share your Location Map!`
            };
        }
    }

    // CHECK 7: Vague landmark without proper reference
    const hasVagueLandmark = /\b(near|beside|opposite|behind|next to|close to|pas|paas|samne|ke paas|ke saamne)\b/i.test(originalText);
    if (hasVagueLandmark && !hasStreetOrArea) {
        return {
            error: true,
            message:
                `Address Vague!\n\n` +
                `"${originalText}" has a vague reference (near/beside) without a street name.\n\n` +
                `Please add:\n` +
                `- Street/Gali Number\n` +
                `- Or Area/Colony Name\n` +
                `- Or specific landmark (e.g., Al-Falah Plaza, MCB Bank)\n\n` +
                `Example:\nHouse 113, Gali 3, near Al-Falah Plaza, Burewala\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // CHECK 8: Repeated characters / spam
    if (/(.)\1{4,}/.test(originalText)) {
        return {
            error: true,
            message:
                `Invalid Address!\n\n` +
                `Please type your real complete address.\n\n` +
                `Example:\nHouse 22, Street 4, Wapda Town, Lahore\n\n` +
                `Best: Share your Location Map!`
        };
    }

    // ALL CHECKS PASSED
    return { error: false };
};
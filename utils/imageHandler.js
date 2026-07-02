
export const processImageForDB = (base64Data) => {
    if (!base64Data) return null;
    
    try {
        // Base64 string to Buffer
        const buffer = Buffer.from(base64Data, 'base64');
        return buffer;
    } catch (error) {
        console.error('❌ Image processing failed:', error.message);
        return null;
    }
};

// Convert Buffer from PostgreSQL back to base64 for display
export const getImageFromDB = (imageBuffer, mimeType) => {
    if (!imageBuffer) return null;
    
    try {
        const base64 = Buffer.from(imageBuffer).toString('base64');
        return `data:${mimeType || 'image/jpeg'};base64,${base64}`;
    } catch (error) {
        console.error('❌ Image retrieval failed:', error.message);
        return null;
    }
};
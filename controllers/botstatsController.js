import Booking from '../models/botBooking.js';
import Service from '../models/botService.js';
import Session from '../models/botSession.js';

// @desc    Get dashboard statistics
// @route   GET /api/stats
export const getStats = async (req, res, next) => {
    try {
        const bookingStats = await Booking.getStats();
        const totalServices = await Service.countActive();
        const activeSessions = await Session.countActive();

        res.json({
            ...bookingStats,
            totalServices,
            activeSessions
        });
    } catch (error) {
        next(error);
    }
};
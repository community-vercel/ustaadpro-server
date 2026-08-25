import Booking from '../models/botBooking.js';
import Session from '../models/botSession.js';
import pool from '../config/db.js';

// @desc    Get dashboard statistics
// @route   GET /api/bot/stats
export const getStats = async (req, res, next) => {
    try {
        const bookingStats = await Booking.getStats();
        
        // Count active services from real services table
        const [svcRows] = await pool.query(
            'SELECT COUNT(*) as count FROM services WHERE COALESCE(is_active, TRUE) = TRUE'
        );
        const activeServices = parseInt(svcRows[0]?.count || 0, 10);
        const activeSessions = await Session.countActive();

        res.json({
            ...bookingStats,
            activeServices,
            totalServices: activeServices,
            activeSessions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bookings timeline
// @route   GET /api/bot/stats/timeline or /api/bot/bookings-timeline
export const getTimeline = async (req, res, next) => {
    try {
        const timeline = await Booking.getTimeline();
        res.json(timeline);
    } catch (error) {
        next(error);
    }
};
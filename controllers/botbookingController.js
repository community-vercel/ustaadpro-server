import Booking from '../models/botBooking.js';

// @desc    Get all bookings
// @route   GET /api/bookings
export const getAllBookings = async (req, res, next) => {
    try {
        const { status } = req.query;
        const bookings = await Booking.findAll(status);
        res.json(bookings);
    } catch (error) {
        next(error);
    }
};

// @desc    Get bookings timeline
// @route   GET /api/bot/bookings-timeline (or similar)
export const getTimeline = async (req, res, next) => {
    try {
        const timeline = await Booking.getTimeline();
        // Format to [{ date: "MM/DD", count: 3 }, ...] or return as-is
        res.json(timeline);
    } catch (error) {
        next(error);
    }
};


// @desc    Update booking status
// @route   PATCH /api/bookings/:id
export const updateBookingStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                error: 'Status is required'
            });
        }

        const booking = await Booking.updateStatus(req.params.id, status);
        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }
        res.json(booking);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
export const deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.delete(req.params.id);
        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }
        res.json({
            message: 'Booking deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
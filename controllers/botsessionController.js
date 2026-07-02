import Session from '../models/botSession.js';

// @desc    Get all sessions
// @route   GET /api/sessions
export const getAllSessions = async (req, res, next) => {
    try {
        const sessions = await Session.findAll();
        res.json(sessions);
    } catch (error) {
        next(error);
    }
};
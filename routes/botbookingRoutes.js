import { Router } from 'express';
import {
    getAllBookings,
    updateBookingStatus,
    deleteBooking
} from '../controllers/botbookingController.js';

const router = Router();

router.get('/', getAllBookings);
router.patch('/:id', updateBookingStatus);
router.delete('/:id', deleteBooking);

export default router;
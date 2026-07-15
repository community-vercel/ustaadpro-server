import { Router } from 'express';
import { startBot, stopBot, getBotStatus, getBotDiagnostics } from '../controllers/botController.js';
import { getTimeline } from '../controllers/botbookingController.js';

const router = Router();

router.post('/start', startBot);
router.post('/stop', stopBot);
router.get('/status', getBotStatus);
router.get('/diagnostics', getBotDiagnostics);
router.get('/bookings-timeline', getTimeline);

export default router;
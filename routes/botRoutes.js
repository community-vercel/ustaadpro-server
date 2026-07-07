import { Router } from 'express';
import { startBot, stopBot, getBotStatus } from '../controllers/botController.js';

const router = Router();

router.post('/start', startBot);
router.post('/stop', stopBot);
router.get('/status', getBotStatus);

export default router;
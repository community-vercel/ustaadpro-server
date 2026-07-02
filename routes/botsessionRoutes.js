import { Router } from 'express';
import { getAllSessions } from '../controllers/botsessionController.js';

const router = Router();

router.get('/', getAllSessions);

export default router;
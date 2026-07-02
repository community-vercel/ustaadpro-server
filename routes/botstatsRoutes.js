import { Router } from 'express';
import { getStats } from '../controllers/botstatsController.js';

const router = Router();

router.get('/', getStats);

export default router;
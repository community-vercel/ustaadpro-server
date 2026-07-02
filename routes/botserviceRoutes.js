import { Router } from 'express';
import {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService
} from '../controllers/botserviceController.js';

const router = Router();

router.route('/')
    .get(getAllServices)
    .post(createService);

router.route('/:id')
    .get(getServiceById)
    .put(updateService)
    .delete(deleteService);

export default router;
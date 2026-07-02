import Service from '../models/botService.js';

// @desc    Get all services
// @route   GET /api/services
export const getAllServices = async (req, res, next) => {
    try {
        const services = await Service.findAll();
        res.json(services);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single service
// @route   GET /api/services/:id
export const getServiceById = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({
                error: 'Service not found'
            });
        }
        res.json(service);
    } catch (error) {
        next(error);
    }
};

// @desc    Create service
// @route   POST /api/services
export const createService = async (req, res, next) => {
    try {
        const { category, name, serviceName, msg, whatsappMessage, options } = req.body;
        const nameFinal = name || serviceName;
        const msgFinal = msg || whatsappMessage;

        if (!category || !nameFinal || !msgFinal) {
            return res.status(400).json({
                error: 'Category, name, and message are required'
            });
        }

        const service = await Service.create({ 
            category, 
            name: nameFinal, 
            msg: msgFinal, 
            options 
        });
        res.status(201).json(service);
    } catch (error) {
        next(error);
    }
};

// @desc    Update service
// @route   PUT /api/services/:id
export const updateService = async (req, res, next) => {
    try {
        const { category, name, serviceName, msg, whatsappMessage, options, active } = req.body;
        const nameFinal = name || serviceName;
        const msgFinal = msg || whatsappMessage;

        const service = await Service.update(req.params.id, {
            category,
            name: nameFinal,
            msg: msgFinal,
            options,
            active
        });
        if (!service) {
            return res.status(404).json({
                error: 'Service not found'
            });
        }
        res.json(service);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
export const deleteService = async (req, res, next) => {
    try {
        const service = await Service.delete(req.params.id);
        if (!service) {
            return res.status(404).json({
                error: 'Service not found'
            });
        }
        res.json({
            message: 'Service deleted successfully',
            service
        });
    } catch (error) {
        next(error);
    }
};
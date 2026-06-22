import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Service from '../models/Service.js';
import Subscription from '../models/Subscription.js';
import AppControl from '../models/AppControl.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getSubcategories = async (req, res) => {
  try {
    const {categoryId} = req.params;
    const subcategories = await Subcategory.findByCategoryId(categoryId);
    res.json(subcategories);
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getServices = async (req, res) => {
  try {
    const {categoryId, subcategoryId} = req.query;
    const services = await Service.getAll({categoryId, subcategoryId});
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getServiceById = async (req, res) => {
  try {
    const {id} = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({message: 'Service not found.'});
    }
    res.json(service);
  } catch (error) {
    console.error('Get service detail error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.getAll();
    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getHomeSlides = async (_req, res) => {
  try {
    const slides = await AppControl.getSlides();
    res.json(slides);
  } catch (error) {
    console.error('Get home slides error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAppSettings = async (_req, res) => {
  try {
    const settings = await AppControl.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Get app settings error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

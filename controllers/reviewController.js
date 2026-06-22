import Review from '../models/Review.js';

export const getServiceReviews = async (req, res) => {
  try {
    const reviews = await Review.findByServiceId(req.params.serviceId);
    res.json(reviews);
  } catch (error) {
    console.error('Get service reviews error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const createServiceReview = async (req, res) => {
  try {
    const {serviceId, orderId, rating, comment} = req.body;
    const numericRating = Number(rating);
    const trimmedComment = String(comment || '').trim();

    if (!serviceId || !orderId) {
      return res.status(400).json({message: 'Service and order are required.'});
    }

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({message: 'Rating must be from 1 to 5 stars.'});
    }

    if (!trimmedComment) {
      return res.status(400).json({message: 'Please write your review.'});
    }

    await Review.create({
      serviceId,
      orderId,
      userId: req.user.id,
      rating: numericRating,
      comment: trimmedComment,
    });

    res.status(201).json({message: 'Review submitted successfully.'});
  } catch (error) {
    console.error('Create service review error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({message: 'You have already reviewed this service booking.'});
    }

    res
      .status(error.statusCode || 500)
      .json({message: error.statusCode ? error.message : 'Internal server error.'});
  }
};

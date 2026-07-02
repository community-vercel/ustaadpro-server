import Order from '../models/Order.js';
import Service from '../models/Service.js';
import AppControl from '../models/AppControl.js';
import User from '../models/User.js';

export const checkout = async (req, res) => {
  try {
    const {
      cart,
      bookedFor,
      paymentMethod,
      address,
      specialInstructions,
      recurringOccurrences,
      useRewardPoints = false,
    } = req.body;
    const userId = req.user.id;
    const occurrenceCount = Math.max(
      1,
      Math.min(Number.parseInt(recurringOccurrences, 10) || 1, 90),
    );

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({message: 'Cart items are required for checkout.'});
    }
    if (!paymentMethod || !address) {
      return res
        .status(400)
        .json({message: 'Payment method and address are required.'});
    }

    let total = 0;
    const itemsToInsert = [];

    for (const cartItem of cart) {
      if (!cartItem.service || !cartItem.service.id || !cartItem.quantity) {
        return res.status(400).json({message: 'Invalid cart item structure.'});
      }

      const service = await Service.findById(cartItem.service.id);
      if (!service) {
        return res
          .status(404)
          .json({message: `Service with ID ${cartItem.service.id} not found.`});
      }

      const itemTotal =
        Number(service.price) * cartItem.quantity * occurrenceCount;
      total += itemTotal;

      itemsToInsert.push({
        serviceId: service.id,
        quantity: cartItem.quantity,
        price: service.price,
      });
    }

    const settings = await AppControl.getSettings();
    const inspectionFee = Number(settings.inspectionFee || 0);
    const rewardEnabled = settings.rewardEnabled !== false;
    const rewardPointValue = Math.max(
      1,
      Number(settings.rewardPointValue || 25),
    );
    const rewardMinimumRedeem = Math.max(
      0,
      Number(settings.rewardMinimumRedeem || 100),
    );
    const serviceRewardMaxDiscountPercent = Math.max(
      0,
      Number(settings.serviceRewardMaxDiscountPercent || 10),
    );
    let rewardPointsRedeemed = 0;
    let rewardDiscount = 0;

    if (useRewardPoints && rewardEnabled) {
      const user = await User.findById(userId);
      const availablePoints = Number(user?.rewardPoints || 0);
      const availableRewardValue = availablePoints * rewardPointValue;
      const maxDiscountByPercent = Math.floor(
        (total * serviceRewardMaxDiscountPercent) / 100,
      );
      const maxAllowedDiscount = Math.min(
        availableRewardValue,
        maxDiscountByPercent,
      );
      const redeemablePoints = Math.floor(maxAllowedDiscount / rewardPointValue);
      const redeemableDiscount = redeemablePoints * rewardPointValue;

      if (
        availableRewardValue < rewardMinimumRedeem ||
        redeemableDiscount < rewardMinimumRedeem ||
        redeemablePoints <= 0
      ) {
        return res.status(400).json({
          message: `You need at least Rs. ${rewardMinimumRedeem} reward value to redeem points.`,
        });
      }

      const redeemed = await User.redeemRewardPoints(userId, redeemablePoints);
      if (!redeemed) {
        return res.status(400).json({message: 'Not enough reward points.'});
      }

      rewardPointsRedeemed = redeemablePoints;
      rewardDiscount = redeemableDiscount;
    }

    const taxableTotal = Math.max(0, total - rewardDiscount);
    const tax = Math.round(
      (taxableTotal * Number(settings.serviceTaxPercent || 0)) / 100,
    );
    const calculatedTotal = taxableTotal + inspectionFee + tax;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const orderId = `USTAADPRO-${randomSuffix.slice(-6)}`;

    await Order.create({
      id: orderId,
      userId,
      total: calculatedTotal,
      status: 'confirmed',
      bookedFor: bookedFor || 'Today, 6:00 PM',
      paymentMethod,
      address,
      specialInstructions,
      inspectionFee: Number(inspectionFee || 0),
      tax: Number(tax || 0),
      rewardPointsEarned: 0,
      rewardPointsRedeemed,
      rewardDiscount,
    });

    await Order.addItems(orderId, itemsToInsert);
    const updatedUser = await User.findById(userId);

    res.status(201).json({
      message: 'Booking confirmed successfully',
      order: {
        id: orderId,
        total: calculatedTotal,
        status: 'confirmed',
        bookedFor: bookedFor || 'Today, 6:00 PM',
        paymentMethod,
        address,
        specialInstructions,
        inspectionFee: Number(inspectionFee || 0),
        tax: Number(tax || 0),
        rewardPointsEarned: 0,
        rewardPointsRedeemed,
        rewardDiscount,
        createdAt: new Date().toISOString(),
        items: cart,
      },
      user: updatedUser
        ? {
            ...updatedUser,
            walletBalance: Number(updatedUser.walletBalance || 0),
            coins: Number(updatedUser.coins || 0),
            rewardPoints: Number(updatedUser.rewardPoints || 0),
          }
        : null,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.findByUserId(req.user.id);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateOrder = async (req, res) => {
  try {
    const {
      address,
      specialInstructions,
      bookedFor,
      cart,
      items,
      recurringOccurrences,
    } = req.body;
    const order = await Order.findOwnedById(req.params.id, req.user.id);

    if (!order) {
      return res.status(404).json({message: 'Order not found.'});
    }

    if (order.status !== 'confirmed') {
      return res
        .status(400)
        .json({message: 'This order can no longer be updated after assignment.'});
    }

    if (!address || !String(address).trim()) {
      return res.status(400).json({message: 'Address is required.'});
    }

    const requestedItems = Array.isArray(items)
      ? items
      : Array.isArray(cart)
        ? cart.map(item => ({
            serviceId: item.service?.id || item.serviceId,
            quantity: item.quantity,
          }))
        : [];

    if (requestedItems.length === 0) {
      return res
        .status(400)
        .json({message: 'At least one service is required to update the order.'});
    }

    const occurrenceCount = Math.max(
      1,
      Math.min(Number.parseInt(recurringOccurrences, 10) || 1, 90),
    );
    let servicesTotal = 0;
    const itemsToInsert = [];

    for (const item of requestedItems) {
      const quantity = Math.max(Number.parseInt(item.quantity, 10) || 1, 1);
      const serviceId = item.serviceId || item.id;

      if (!serviceId) {
        return res.status(400).json({message: 'Invalid service item.'});
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        return res
          .status(404)
          .json({message: `Service with ID ${serviceId} not found.`});
      }

      servicesTotal += Number(service.price) * quantity * occurrenceCount;
      itemsToInsert.push({
        serviceId: service.id,
        quantity,
        price: service.price,
      });
    }

    const settings = await AppControl.getSettings();
    const inspectionFee = Number(settings.inspectionFee || 0);
    const rewardPointValue = Math.max(
      1,
      Number(settings.rewardPointValue || 25),
    );
    const serviceRewardMaxDiscountPercent = Math.max(
      0,
      Number(settings.serviceRewardMaxDiscountPercent || 10),
    );
    const previousRedeemedValue =
      Number(order.rewardPointsRedeemed || 0) * rewardPointValue;
    const maxDiscountByPercent = Math.floor(
      (servicesTotal * serviceRewardMaxDiscountPercent) / 100,
    );
    const rewardDiscount =
      Number(order.rewardPointsRedeemed || 0) > 0
        ? Math.min(previousRedeemedValue, maxDiscountByPercent)
        : 0;
    const taxableTotal = Math.max(0, servicesTotal - rewardDiscount);
    const tax = Math.round(
      (taxableTotal * Number(settings.serviceTaxPercent || 0)) / 100,
    );
    const calculatedTotal = taxableTotal + inspectionFee + tax;

    await Order.updateDetails(req.params.id, req.user.id, {
      bookedFor: bookedFor ? String(bookedFor).trim() : 'Schedule pending',
      address: String(address).trim(),
      specialInstructions: specialInstructions
        ? String(specialInstructions).trim()
        : null,
      total: calculatedTotal,
      inspectionFee,
      tax,
      rewardDiscount,
    });

    await Order.replaceItems(req.params.id, itemsToInsert);

    const orders = await Order.findByUserId(req.user.id);
    res.json({
      message: 'Order updated successfully.',
      order: orders.find(item => item.id === req.params.id),
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const cancelReason = String(req.body?.cancelReason || '').trim();
    const order = await Order.findOwnedById(req.params.id, req.user.id);

    if (!order) {
      return res.status(404).json({message: 'Order not found.'});
    }

    if (!cancelReason) {
      return res.status(400).json({message: 'Cancellation reason is required.'});
    }

    if (order.status !== 'confirmed') {
      return res
        .status(400)
        .json({message: 'This order can no longer be cancelled after assignment.'});
    }

    await Order.updateStatus(req.params.id, 'cancelled', cancelReason);

    res.json({
      message: 'Order cancelled successfully.',
      id: req.params.id,
      status: 'cancelled',
      cancelReason,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

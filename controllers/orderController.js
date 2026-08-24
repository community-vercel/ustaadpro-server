import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import Order from '../models/Order.js';
import Service from '../models/Service.js';
import AppControl from '../models/AppControl.js';
import User from '../models/User.js';
import PaymentReceipt from '../models/PaymentReceipt.js';

const EASYPAISA_ACCOUNT_NUMBER = '03485838593';
const EASYPAISA_ACCOUNT_TITLE = 'Muhammad Ikram';

async function saveReceiptImage(dataUrl, filename = 'payment-receipt.jpg') {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    const error = new Error('A valid receipt image is required.');
    error.statusCode = 400;
    throw error;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    const error = new Error('Invalid receipt image format.');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = match[1];
  const base64 = match[2];
  const image = Buffer.from(base64, 'base64');
  if (!image.length) {
    const error = new Error('The receipt image is empty.');
    error.statusCode = 400;
    throw error;
  }

  // Local upload files are removed by application rebuilds. Persist the
  // validated proof in the database-backed receipt URL so it remains available.
  return `data:${mimeType};base64,${image.toString('base64')}`;
}

function resolveSelectedWork(service, item) {
  const requestedWorkId =
    item.serviceWorkPriceId ||
    item.workPriceId ||
    item.selectedWorkPriceId ||
    item.service?.selectedWorkPrice?.id ||
    item.service?.selectedWorkPriceId;

  const selectedWork = requestedWorkId
    ? service.workPrices?.find(work => Number(work.id) === Number(requestedWorkId))
    : null;

  if (requestedWorkId && !selectedWork) {
    const error = new Error('Selected service work price was not found.');
    error.statusCode = 400;
    throw error;
  }

  return {
    serviceWorkPriceId: selectedWork?.id || null,
    serviceWorkTitle: selectedWork?.title || item.service?.selectedWorkPrice?.title || service.title,
    price: selectedWork ? selectedWork.price : service.price,
  };
}

function parseBookingStartInPakistan(bookedFor) {
  const matches = [...String(bookedFor || '').matchAll(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})\s+-\s+(\d{1,2}):(\d{2})\s+([AP]M)/g)];
  const match = matches[0];
  if (!match) return null;

  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(match[1]);
  if (month < 0) return null;
  const hour12 = Number(match[4]);
  const hour = match[6] === 'PM' ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
  return new Date(Date.UTC(Number(match[3]), month, Number(match[2]), hour - 5, Number(match[5])));
}
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
      useWalletBalance = false,
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
      if (!cartItem.service || !cartItem.service.id) {
        return res.status(400).json({message: 'Invalid cart item structure.'});
      }
      const quantity = Number(cartItem.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({message: 'Each service quantity must be a whole number between 1 and 20.'});
      }

      const service = await Service.findById(cartItem.service.id);
      if (!service) {
        return res
          .status(404)
          .json({message: `Service with ID ${cartItem.service.id} not found.`});
      }

      const selectedWork = resolveSelectedWork(service, cartItem);
      const itemTotal =
        Number(selectedWork.price) * quantity * occurrenceCount;
      total += itemTotal;

      const existingItem = itemsToInsert.find(item =>
        item.serviceId === service.id && item.serviceWorkPriceId === selectedWork.serviceWorkPriceId,
      );
      if (existingItem) {
        if (existingItem.quantity + quantity > 20) {
          return res.status(400).json({message: 'A service work item cannot exceed quantity 20 per booking.'});
        }
        existingItem.quantity += quantity;
      } else {
        itemsToInsert.push({
          serviceId: service.id,
          serviceWorkPriceId: selectedWork.serviceWorkPriceId,
          serviceWorkTitle: selectedWork.serviceWorkTitle,
          quantity,
          price: selectedWork.price,
        });
      }
    }

    const settings = await AppControl.getSettings();
    const minimumBookingLeadHours = Math.max(0, Math.min(168, Number(settings.minimumBookingLeadHours || 0)));
    const bookingStart = parseBookingStartInPakistan(bookedFor);
    if (bookingStart && bookingStart.getTime() < Date.now() + minimumBookingLeadHours * 60 * 60 * 1000) {
      return res.status(400).json({
        message: `Please choose a time at least ${minimumBookingLeadHours} hour(s) from now.`,
      });
    }
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

    const afterRewardTotal = Math.max(0, total - rewardDiscount);
    const fullAdvanceDiscount =
      paymentMethod === 'Full Payment in Advance'
        ? Math.round(afterRewardTotal * 0.05)
        : 0;
    const taxableTotal = Math.max(0, afterRewardTotal - fullAdvanceDiscount);
    const tax = Math.round(
      (taxableTotal * Number(settings.serviceTaxPercent || 0)) / 100,
    );
    const calculatedTotal = taxableTotal + inspectionFee + tax;
    let walletUsed = 0;
    if (useWalletBalance) {
      console.info('[Wallet] Checkout requested for user ' + userId + '; order total Rs ' + calculatedTotal + '.');
      walletUsed = await User.consumeWallet(userId, calculatedTotal);
    }
    const payableTotal = Math.max(0, calculatedTotal - walletUsed);
    console.info('[Wallet] Checkout calculated for user ' + userId + ': used Rs ' + walletUsed + ', payable Rs ' + payableTotal + '.');

    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const orderId = `USTAADPRO-${randomSuffix.slice(-6)}`;

    try {
      await Order.create({
        id: orderId,
        userId,
        total: payableTotal,
        status: payableTotal === 0 ? 'confirmed' : 'checking_receipt',
        bookedFor: bookedFor || 'Today, 6:00 PM',
        paymentMethod,
        address,
        specialInstructions,
        inspectionFee: Number(inspectionFee || 0),
        tax: Number(tax || 0),
        rewardPointsEarned: 0,
        rewardPointsRedeemed,
        rewardDiscount,
        walletUsed,
        originalTotal: calculatedTotal,
      });
      await Order.addItems(orderId, itemsToInsert);
      console.info('[Wallet] Booking ' + orderId + ' created: used Rs ' + walletUsed + ', payable Rs ' + payableTotal + '.');
    } catch (error) {
      console.error('[Wallet] Booking ' + orderId + ' failed; restoring Rs ' + walletUsed + '.');
      await Order.remove(orderId, userId).catch(() => {});
      if (walletUsed > 0) await User.creditWallet(userId, walletUsed);
      throw error;
    }
    const updatedUser = await User.findById(userId);

    res.status(201).json({
      message: payableTotal === 0
        ? 'Booking confirmed using wallet balance.'
        : 'Booking created. Payment receipt verification is required.',
      order: {
        id: orderId,
        total: payableTotal,
        originalTotal: calculatedTotal,
        walletUsed,
        status: payableTotal === 0 ? 'confirmed' : 'checking_receipt',
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
    res.status(error.statusCode || 500).json({message: error.message || 'Internal server error.'});
  }
};

export const getOrderStatuses = async (req, res) => {
  try {
    const statuses = await Order.findStatusesByUserId(req.user.id);
    res.json(statuses);
  } catch (error) {
    console.error('Get order statuses error:', error);
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

    if (!['confirmed', 'checking_receipt'].includes(order.status)) {
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

      const selectedWork = resolveSelectedWork(service, item);
      servicesTotal += Number(selectedWork.price) * quantity * occurrenceCount;
      itemsToInsert.push({
        serviceId: service.id,
        serviceWorkPriceId: selectedWork.serviceWorkPriceId,
        serviceWorkTitle: selectedWork.serviceWorkTitle,
        quantity,
        price: selectedWork.price,
      });
    }

    const settings = await AppControl.getSettings();
    const minimumBookingLeadHours = Math.max(0, Math.min(168, Number(settings.minimumBookingLeadHours || 0)));
    const bookingStart = parseBookingStartInPakistan(bookedFor);
    if (bookingStart && bookingStart.getTime() < Date.now() + minimumBookingLeadHours * 60 * 60 * 1000) {
      return res.status(400).json({
        message: `Please choose a time at least ${minimumBookingLeadHours} hour(s) from now.`,
      });
    }
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
    res.status(error.statusCode || 500).json({message: error.message || 'Internal server error.'});
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

    if (!['confirmed', 'checking_receipt'].includes(order.status)) {
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

export const getPaymentReceiptImage = async (req, res) => {
  try {
    const storedImage = await PaymentReceipt.findImage(
      req.params.id,
      req.params.receiptId,
      req.user.id,
    );
    if (!storedImage) {
      return res.status(404).json({message: 'Receipt image not found.'});
    }

    const match = String(storedImage).match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
    );
    if (!match) {
      return res.redirect(storedImage);
    }

    res.set('Content-Type', match[1]);
    res.set('Cache-Control', 'private, max-age=86400');
    return res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    console.error('Get receipt image error:', error);
    return res.status(500).json({message: 'Unable to load receipt image.'});
  }
};
export const uploadPaymentReceipt = async (req, res) => {
  try {
    const receiptUrl = await saveReceiptImage(req.body?.dataUrl, req.body?.filename);
    const amount = Number(req.body?.amount || 0);

    const receipt = await PaymentReceipt.create({
      orderId: req.params.id,
      userId: req.user.id,
      receiptUrl,
      amount,
      accountNumber: EASYPAISA_ACCOUNT_NUMBER,
      accountTitle: EASYPAISA_ACCOUNT_TITLE,
    });

    res.status(201).json({
      message: 'Receipt uploaded successfully.',
      receiptId: receipt.id,
      paymentStage: receipt.paymentStage,
      receiptUrl: `/api/orders/${encodeURIComponent(req.params.id)}/receipts/${receipt.id}/image`,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({message: error.message || 'Internal server error.'});
  }
};

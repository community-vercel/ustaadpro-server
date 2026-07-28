import Shop from '../models/Shop.js';
import AppControl from '../models/AppControl.js';
import User from '../models/User.js';
import { getFirebaseMessaging } from '../utils/firebase.js';

const SHOP_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

export const getShopProducts = async (req, res) => {
  try {
    const limitParam = req.query.limit !== undefined ? Math.min(200, Math.max(1, Number(req.query.limit))) : undefined;
    const offset = Math.max(0, Number(req.query.offset || 0));
    const category = String(req.query.category || 'All').trim() || 'All';
    const search = String(req.query.search || '').trim();
    const categoryFilter = category === 'All' ? null : category;
    const [products, total, categories] = await Promise.all([
      Shop.getProducts({activeOnly: true, category: categoryFilter, search, limit: limitParam, offset}),
      Shop.countProducts({activeOnly: true, category: categoryFilter, search}),
      Shop.getCategories({activeOnly: true}),
    ]);

    res.json({
      products,
      categories,
      limit: limitParam ?? null,
      offset,
      total,
      category,
      search,
      hasMore: limitParam !== undefined && (offset + products.length < total),
    });
  } catch (error) {
    console.error('Shop products error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getMyShopOrders = async (req, res) => {
  try {
    res.json(await Shop.getOrders({userId: req.user.id}));
  } catch (error) {
    console.error('Shop orders error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const checkoutShopOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      paymentMethod = 'Cash on Delivery',
      useRewardPoints = false,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({message: 'Shop cart items are required.'});
    }
    if (!address) {
      return res.status(400).json({message: 'Delivery address is required.'});
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Shop.findProductById(item.productId || item.product?.id);
      const quantity = Number(item.quantity || 0);

      if (!product || !product.isActive) {
        return res.status(404).json({message: 'Product not found.'});
      }
      if (quantity <= 0) {
        return res.status(400).json({message: 'Invalid product quantity.'});
      }
      if (product.stock < quantity) {
        return res
          .status(400)
          .json({message: `${product.title} has only ${product.stock} in stock.`});
      }

      subtotal += product.price * quantity;
      orderItems.push({
        productId: product.id,
        quantity,
        price: product.price,
      });
    }

    const suffix = Math.floor(100000 + Math.random() * 900000).toString();
    const orderId = `SHOP-${suffix}`;
    const settings = await AppControl.getSettings();
    const shippingCost = Number(settings.shippingCost || 0);
    let rewardPointsRedeemed = 0;
    let rewardDiscount = 0;

    if (useRewardPoints && settings.rewardEnabled !== false) {
      const pointValue = Math.max(1, Number(settings.rewardPointValue || 25));
      const minimumRedeem = Math.max(
        0,
        Number(settings.rewardMinimumRedeem || 100),
      );
      const maxDiscountPercent = Math.max(
        0,
        Number(settings.shopRewardMaxDiscountPercent || 5),
      );
      const user = await User.findById(req.user.id);
      const availablePoints = Number(user?.rewardPoints || 0);
      const availableRewardValue = availablePoints * pointValue;
      const maxDiscountByPercent = Math.floor(
        (subtotal * maxDiscountPercent) / 100,
      );
      const maxAllowedDiscount = Math.min(
        availableRewardValue,
        maxDiscountByPercent,
      );
      const redeemablePoints = Math.floor(maxAllowedDiscount / pointValue);
      const redeemableDiscount = redeemablePoints * pointValue;

      if (
        availableRewardValue < minimumRedeem ||
        redeemableDiscount < minimumRedeem ||
        redeemablePoints <= 0
      ) {
        return res.status(400).json({
          message: `You need at least Rs. ${minimumRedeem} reward value to redeem points.`,
        });
      }

      const redeemed = await User.redeemRewardPoints(
        req.user.id,
        redeemablePoints,
      );
      if (!redeemed) {
        return res.status(400).json({message: 'Not enough reward points.'});
      }

      rewardPointsRedeemed = redeemablePoints;
      rewardDiscount = redeemableDiscount;
    }

    const total = Math.max(0, subtotal - rewardDiscount) + shippingCost;

    await Shop.createOrder({
      id: orderId,
      userId: req.user.id,
      total,
      shippingCost,
      status: 'placed',
      paymentMethod,
      address,
      rewardPointsEarned: 0,
      rewardPointsRedeemed,
      rewardDiscount,
      items: orderItems,
    });

    const [order] = await Shop.getOrders({userId: req.user.id});
    const updatedUser = await User.findById(req.user.id);
    res.status(201).json({
      message: 'Shop order placed.',
      order,
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
    console.error('Shop checkout error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminShopProducts = async (_req, res) => {
  try {
    res.json(await Shop.getProducts({activeOnly: false}));
  } catch (error) {
    console.error('Admin shop products error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const saveAdminShopProduct = async (req, res) => {
  try {
    const {title, price} = req.body;
    if (!title || Number(price || 0) <= 0) {
      return res.status(400).json({message: 'Product title and price are required.'});
    }

    const id = await Shop.saveProduct({...req.body, id: req.params.id || req.body.id});
    res.json({message: 'Shop product saved.', id});
  } catch (error) {
    console.error('Admin save shop product error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminShopOrders = async (_req, res) => {
  try {
    res.json(await Shop.getOrders());
  } catch (error) {
    console.error('Admin shop orders error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const updateAdminShopOrderStatus = async (req, res) => {
  try {
    const {status, cancelReason} = req.body;
    if (!SHOP_STATUSES.includes(status)) {
      return res.status(400).json({message: 'Invalid shop order status.'});
    }

    await Shop.updateOrderStatus(req.params.id, status, cancelReason);
    const owner = await Shop.findOrderOwner(req.params.id);
    const messaging = getFirebaseMessaging();
    let pushStatus = 'not_sent';
    let pushMessage = 'No FCM token is saved for this customer.';

    if (owner?.fcmToken && messaging) {
      try {
        const notificationId = `shop-${req.params.id}-${Date.now()}`;
        await messaging.send({
          token: owner.fcmToken,
          android: {
            priority: 'high',
            notification: {
              channelId: 'order_updates',
              icon: 'ic_notification',
              color: '#006C49',
              sound: 'default',
            },
          },
          notification: {
            title: 'Store Order Updated',
            body: `Your store order is now: ${status.toUpperCase()}`,
          },
          data: {
            orderId: req.params.id,
            status,
            type: 'shop_order',
            notificationId,
          },
        });
        pushStatus = 'sent';
        pushMessage = 'Push notification sent.';
        console.log(`Shop push notification sent for order ${req.params.id}`);
      } catch (pushError) {
        pushStatus = 'failed';
        pushMessage = pushError?.message || 'Push notification failed.';
        console.error('Failed to send shop push notification:', pushError);
      }
    } else if (!messaging) {
      pushStatus = 'not_configured';
      pushMessage = 'Firebase Admin SDK is not configured on the server.';
    }

    res.json({
      message: 'Shop order status updated.',
      id: req.params.id,
      status,
      pushStatus,
      pushMessage,
    });
  } catch (error) {
    console.error('Admin shop order status error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const cancelShopOrder = async (req, res) => {
  try {
    const {cancelReason} = req.body;
    // ensure the user owns the order, but for simplicity here we just update it
    // we could check the owner like we do for finding FCM token
    const owner = await Shop.findOrderOwner(req.params.id);
    if (!owner || owner.userId !== req.user.id) {
      return res.status(403).json({message: 'Unauthorized'});
    }
    await Shop.updateOrderStatus(req.params.id, 'cancelled', cancelReason);
    res.json({message: 'Shop order cancelled.', status: 'cancelled', cancelReason});
  } catch (error) {
    console.error('Cancel shop order error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

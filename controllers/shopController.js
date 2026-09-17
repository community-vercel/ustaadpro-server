import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
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
    const brand = req.query.brand ? String(req.query.brand).trim() : null;
    const search = String(req.query.search || '').trim();
    const categoryFilter = category === 'All' ? null : category;
    const brandFilter = brand === 'All Brands' ? null : brand;
    const [products, total, categories] = await Promise.all([
      Shop.getProducts({activeOnly: true, category: categoryFilter, brand: brandFilter, search, limit: limitParam, offset}),
      Shop.countProducts({activeOnly: true, category: categoryFilter, brand: brandFilter, search}),
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

export const getShopBrands = async (req, res) => {
  try {
    const category = String(req.query.category || 'All').trim() || 'All';
    const categoryFilter = category === 'All' ? null : category;
    const brands = await Shop.getBrands({activeOnly: true, category: categoryFilter});
    res.json({brands});
  } catch (error) {
    console.error('Shop brands error:', error);
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

export const getAdminShopProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(10000, Math.max(5, Number(req.query.limit || 10)));
    const category = String(req.query.category || 'All');
    const search = String(req.query.search || '').trim();
    const options = {activeOnly: false, category, search};
    const [products, total, categories] = await Promise.all([
      Shop.getProducts({...options, limit, offset: (page - 1) * limit}),
      Shop.countProducts(options),
      Shop.getCategories({activeOnly: false}),
    ]);
    res.json({products, total, page, limit, categories});
  } catch (error) {
    console.error('Admin shop products error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const getAdminShopProduct = async (req, res) => {
  try {
    const product = await Shop.findProductById(req.params.id);
    if (!product) return res.status(404).json({message: 'Product not found.'});
    res.json(product);
  } catch (error) {
    console.error('Admin shop product detail error:', error);
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

export const deleteAdminShopProduct = async (req, res) => {
  try {
    const {id} = req.params;
    if (!id) return res.status(400).json({message: 'Product ID is required.'});
    await Shop.deleteProduct(id);
    res.json({message: 'Product deleted.'});
  } catch (error) {
    console.error('Admin delete shop product error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const bulkDeleteAdminShopProducts = async (req, res) => {
  try {
    const {ids} = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({message: 'A list of product IDs is required.'});
    }
    await Shop.deleteProducts(ids);
    res.json({message: `${ids.length} product(s) deleted.`, deleted: ids.length});
  } catch (error) {
    console.error('Admin bulk delete shop products error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const deleteAllAdminShopProducts = async (req, res) => {
  try {
    const deleted = await Shop.deleteAllProducts();
    res.json({message: `All ${deleted} product(s) deleted.`, deleted});
  } catch (error) {
    console.error('Admin delete all shop products error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const importAdminShopProducts = async (req, res) => {
  try {
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({message: 'CSV text is required.'});
    }

    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({message: 'CSV must have a header row and at least one product row.'});
    }

    // Parse header to get column positions (case-insensitive)
    const parseCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && !inQuotes) { inQuotes = true; }
        else if (ch === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"' && inQuotes) { inQuotes = false; }
        else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += ch; }
      }
      result.push(current);
      return result;
    };

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
    const col = (name) => headers.indexOf(name);

    const idCol        = col('id');
    const titleCol     = col('title');
    const categoryCol  = col('category');
    const brandCol     = col('brand');
    const descCol      = col('description');
    const priceCol     = col('price (pkr)') !== -1 ? col('price (pkr)') : col('price');
    const origPriceCol = col('original price (pkr)') !== -1 ? col('original price (pkr)') : col('original price');
    const stockCol     = col('stock');
    const activeCol    = col('active');
    const imageCol     = col('image url') !== -1 ? col('image url') : col('image');

    if (titleCol === -1 || priceCol === -1) {
      return res.status(400).json({message: 'CSV must contain at least "Title" and "Price" columns.'});
    }

    const results = { saved: 0, skipped: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const title = row[titleCol]?.trim();
      const price = Number(row[priceCol]?.replace(/[^0-9.]/g, '') || 0);

      if (!title || price <= 0) {
        results.skipped++;
        continue;
      }

      try {
        await Shop.saveProduct({
          id: idCol !== -1 ? row[idCol]?.trim() || undefined : undefined,
          title,
          category: categoryCol !== -1 ? row[categoryCol]?.trim() || 'General' : 'General',
          brand: brandCol !== -1 ? row[brandCol]?.trim() || null : null,
          description: descCol !== -1 ? row[descCol]?.trim() || '' : '',
          price,
          originalPrice: origPriceCol !== -1 ? Number(row[origPriceCol]?.replace(/[^0-9.]/g, '') || 0) : 0,
          imageUrl: imageCol !== -1 ? row[imageCol]?.trim() || null : null,
          stock: stockCol !== -1 ? Number(row[stockCol]?.trim() || 0) : 0,
          isActive: activeCol !== -1 ? (row[activeCol]?.trim().toLowerCase() !== 'no') : true,
        });
        results.saved++;
      } catch (err) {
        results.errors.push(`Row ${i + 1} (${title}): ${err.message}`);
        results.skipped++;
      }
    }

    res.json({
      message: `Import complete. ${results.saved} saved, ${results.skipped} skipped.`,
      ...results,
    });
  } catch (error) {
    console.error('Admin import shop products error:', error);
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


export const exportAdminShopProductsTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products Template');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 18 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Price', key: 'price', width: 14 },
      { header: 'Original Price', key: 'originalPrice', width: 16 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
      { header: 'Image URL', key: 'imageUrl', width: 30 },
      { header: 'Image', key: 'image', width: 16 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006C49' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF004a32' } } };
    });

    // Instruction row (row 2)
    worksheet.addRow({
      id: '← Leave empty for new product. Fill in to UPDATE existing.',
      title: 'e.g. Paint Roller Pro',
      category: 'e.g. Painting',
      brand: 'e.g. Berger',
      description: 'Short product description here',
      price: 350,
      originalPrice: 450,
      stock: 100,
      isActive: 'Yes',
      imageUrl: 'or paste URL here',
    });

    const instructionRow = worksheet.getRow(2);
    instructionRow.height = 18;
    instructionRow.eachCell(cell => {
      cell.font = { italic: true, color: { argb: 'FF888888' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FFF7' } };
    });

    // Note in the Image column (K2) explaining how to paste
    const imgNoteCell = worksheet.getCell('K2');
    imgNoteCell.value = '← Paste/Insert real image here';
    imgNoteCell.font = { italic: true, bold: true, color: { argb: 'FF006C49' } };

    // Freeze top row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Add a few blank rows for the user to fill in
    for (let i = 0; i < 10; i++) {
      const row = worksheet.addRow({});
      row.height = 65; // tall enough to see pasted images
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="shop-products-import-template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Template export error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const exportAdminShopProductsExcel = async (req, res) => {

  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || 'All');
    const options = {activeOnly: false, category, search};
    const products = await Shop.getProducts({...options, limit: 10000, offset: 0});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Original Price', key: 'originalPrice', width: 15 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
      { header: 'Image URL', key: 'imageUrl', width: 30 },
      { header: 'Image', key: 'image', width: 15 },
    ];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const row = worksheet.addRow({
        id: p.id,
        title: p.title,
        category: p.category,
        brand: p.brand || '',
        description: p.description || '',
        price: p.price,
        originalPrice: p.originalPrice,
        stock: p.stock,
        isActive: p.isActive ? 'Yes' : 'No',
        imageUrl: p.imageUrl || ''
      });
      
      if (p.imageUrl) {
        row.height = 80;
        try {
          if (p.imageUrl.startsWith('/uploads/')) {
            const imgPath = path.join(process.cwd(), p.imageUrl);
            if (fs.existsSync(imgPath)) {
              const imageId = workbook.addImage({
                filename: imgPath,
                extension: path.extname(imgPath).slice(1) || 'png'
              });
              worksheet.addImage(imageId, {
                tl: { col: 10, row: i + 1 },
                ext: { width: 80, height: 80 },
                editAs: 'oneCell'
              });
            }
          }
        } catch (e) { console.error('Error embedding image', e); }
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ustaadpro-shop-products.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({message: 'Internal server error.'});
  }
};

export const importAdminShopProductsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({message: 'No file uploaded.'});
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return res.status(400).json({message: 'Spreadsheet is empty.'});
    
    const headers = {};
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      headers[String(cell.value).toLowerCase().trim()] = colNumber;
    });
    
    const col = (name) => headers[name] || headers[`${name} (pkr)`] || -1;
    
    const idCol        = col('id');
    const titleCol     = col('title');
    const categoryCol  = col('category');
    const brandCol     = col('brand');
    const descCol      = col('description');
    const priceCol     = col('price');
    const origPriceCol = col('original price');
    const stockCol     = col('stock');
    const activeCol    = col('active');
    const imageCol     = col('image url') !== -1 ? col('image url') : col('image');
    
    if (titleCol === -1 || priceCol === -1) {
      return res.status(400).json({message: 'Excel must contain at least "Title" and "Price" columns.'});
    }

    const imagesByRow = {};
    if (worksheet.getImages) {
      for (const img of worksheet.getImages()) {
        // Use Math.round to handle floating point anchors (e.g. 1.9 vs 2.0)
        const rowNum = Math.round(img.range.tl.row) + 1;
        imagesByRow[rowNum] = img.imageId;
      }
    }
    
    const results = { saved: 0, skipped: 0, errors: [] };
    
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const title = String(row.getCell(titleCol).value || '').trim();
      const priceRaw = String(row.getCell(priceCol).value || '');
      const price = Number(priceRaw.replace(/[^0-9.]/g, '') || 0);
      
      if (!title || price <= 0) {
        if (title || priceRaw) results.skipped++;
        continue;
      }
      
      let finalImageUrl = imageCol !== -1 ? String(row.getCell(imageCol).value || '').trim() : null;
      if (finalImageUrl === 'null' || finalImageUrl === 'undefined') finalImageUrl = null;
      
      if (imagesByRow[i]) {
        const media = workbook.model.media.find(m => m.index === imagesByRow[i]);
        if (media && media.buffer) {
          const ext = media.extension || 'png';
          const filename = `shop-products/product-${Date.now()}-${Math.floor(Math.random()*1000)}.${ext}`;
          const fullPath = path.join(process.cwd(), 'uploads', filename);
          fs.writeFileSync(fullPath, media.buffer);
          finalImageUrl = `/uploads/${filename}`;
        }
      }

      try {
        await Shop.saveProduct({
          id: idCol !== -1 ? (row.getCell(idCol).value ? String(row.getCell(idCol).value).trim() : undefined) : undefined,
          title,
          category: categoryCol !== -1 ? String(row.getCell(categoryCol).value || 'General').trim() : 'General',
          brand: brandCol !== -1 ? String(row.getCell(brandCol).value || '').trim() || null : null,
          description: descCol !== -1 ? String(row.getCell(descCol).value || '').trim() : '',
          price,
          originalPrice: origPriceCol !== -1 ? Number(String(row.getCell(origPriceCol).value || '').replace(/[^0-9.]/g, '') || 0) : 0,
          imageUrl: finalImageUrl,
          stock: stockCol !== -1 ? Number(String(row.getCell(stockCol).value || 0).trim()) : 0,
          isActive: activeCol !== -1 ? (String(row.getCell(activeCol).value || 'yes').trim().toLowerCase() !== 'no') : true,
        });
        results.saved++;
      } catch (err) {
        results.errors.push(`Row ${i} (${title}): ${err.message}`);
        results.skipped++;
      }
    }
    
    res.json({
      message: `Import complete. ${results.saved} saved, ${results.skipped} skipped.`,
      errors: results.errors
    });
  } catch (error) {
    console.error('Admin import shop products excel error:', error);
    res.status(500).json({message: 'Internal server error.', error: error.message});
  }
};

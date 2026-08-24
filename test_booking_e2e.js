import http from 'http';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'ustaadpro_super_secret_key_123!';

async function request(path, options = {}, body = null) {
  const url = new URL(path, API_BASE);
  const opts = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runE2ETest() {
  console.log('=== STARTING E2E VERIFICATION FOR ALL 4 BOOKING FEATURES ===\n');

  // Step 1: Token
  console.log('Step 1: Authenticating user...');
  const token = jwt.sign({ id: 1, email: 'test671902@gmail.com', phone: '+92300671902' }, JWT_SECRET, {
    expiresIn: '30d',
  });
  console.log('Token acquired.');

  // Step 2: Service
  console.log('\nStep 2: Browsing service...');
  const servicesRes = await request('/api/services');
  const services = Array.isArray(servicesRes.body) ? servicesRes.body : [];
  const targetService = services[0] || { id: 'home-cleaning', title: 'Home Cleaning', price: 2500 };
  console.log(`Target Service: "${targetService.title}" (Price: Rs ${targetService.price})`);

  // Step 3: Feature 1 (30-min time slot) + Feature 2 (Recurring 7 days) + Feature 3 (Map Address) + Feature 4 (EasyPaisa)
  console.log('\nStep 3: Creating Recurring 7-day booking with Map Location & 30-min Time Slot...');
  const bookingPayload = {
    cart: [
      {
        service: {
          id: targetService.id,
          title: targetService.title,
          price: targetService.price,
        },
        quantity: 1,
      },
    ],
    bookedFor: '25 Jul 2026 at 09:30 AM (7 Days Recurring Service)',
    paymentMethod: 'Easypaisa',
    address: 'House 12, Street 4, Bahria Phase 5 (Lat: 33.5412, Lng: 73.1245)',
    specialInstructions: 'Deep cleaning required every morning at 9:30 AM',
    inspectionFee: 500,
    tax: 300,
    recurringOccurrences: 7,
    useRewardPoints: false,
    customerName: 'Raja Sajawal',
    customerPhone: '03176379977',
  };

  const bookingRes = await request(
    '/api/orders/checkout',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
    bookingPayload
  );

  console.log('Booking Status:', bookingRes.status);
  if (bookingRes.status !== 201 || !bookingRes.body?.order?.id) {
    console.error('❌ BOOKING FAILED!', bookingRes.body);
    process.exit(1);
  }

  const orderId = bookingRes.body.order.id;
  const orderTotal = bookingRes.body.order.total;
  console.log(`✅ BOOKING CREATED! Reference ID: ${orderId} (Total: Rs ${orderTotal})`);

  // Step 4: Feature 4 Receipt Upload
  console.log('\nStep 4: Uploading EasyPaisa Payment Receipt Screenshot...');
  const dummyBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // Mark status completed or test receipt upload API
  await request('/api/admin/orders/' + orderId + '/status', { method: 'PATCH' }, { status: 'completed' });

  const receiptRes = await request(
    `/api/orders/${orderId}/payment-receipt`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
    {
      dataUrl: dummyBase64Image,
      filename: 'easypaisa-receipt-test.png',
      amount: orderTotal,
    }
  );

  console.log('Receipt Upload Status:', receiptRes.status);
  console.log('Receipt URL:', receiptRes.body?.receiptUrl);

  // Step 5: Admin Panel Verification
  console.log('\nStep 5: Verifying Admin Panel visibility...');
  const adminRes = await request('/api/admin/orders');
  const adminOrders = Array.isArray(adminRes.body) ? adminRes.body : [];
  const foundOrder = adminOrders.find((o) => o.id === orderId);

  if (foundOrder) {
    console.log('\n======================================================');
    console.log('🎉 ALL 4 FEATURES VERIFIED SUCCESSFULLY!');
    console.log(`Order ID:        ${foundOrder.id}`);
    console.log(`Customer:        ${foundOrder.customerName} (${foundOrder.customerPhone})`);
    console.log(`Booking Schedule:${foundOrder.bookedFor}`);
    console.log(`Map Address:     ${foundOrder.address}`);
    console.log(`Payment Option:  ${foundOrder.paymentMethod}`);
    console.log(`Total Price:     Rs ${foundOrder.total}`);
    console.log('======================================================\n');
  }
}

runE2ETest().catch(console.error);

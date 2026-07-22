# UstaadPro API Documentation (Complete A-Z)

This document contains a comprehensive list of all API endpoints for the UstaadPro Server, including payloads and expected responses.

Base URL: `http://localhost:5000` (or your live server URL)

---

## 1. Authentication (`/api/auth`)

### 1.1 Signup
- **Endpoint**: `POST /api/auth/signup`
- **Auth**: None
- **Payload**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+923001234567",
    "password": "password123"
  }
  ```

### 1.2 Verify Signup OTP
- **Endpoint**: `POST /api/auth/verify-signup-otp`
- **Auth**: None
- **Payload**: `{ "email": "john@example.com", "otp": "1234" }`

### 1.3 Login (Email/Password)
- **Endpoint**: `POST /api/auth/login`
- **Auth**: None
- **Payload**: `{ "email": "john@example.com", "password": "password123" }`

### 1.4 Login (Phone - Direct if no OTP)
- **Endpoint**: `POST /api/auth/login-phone`
- **Auth**: None
- **Payload**: `{ "phone": "+923001234567" }`

### 1.5 Request Login OTP
- **Endpoint**: `POST /api/auth/request-login-otp`
- **Auth**: None
- **Payload**: `{ "phone": "+923001234567" }`

### 1.6 Verify Login OTP
- **Endpoint**: `POST /api/auth/verify-login-otp`
- **Auth**: None
- **Payload**: `{ "phone": "+923001234567", "otp": "1234" }`

### 1.7 Request Password Reset OTP
- **Endpoint**: `POST /api/auth/forgot-password/request-otp`
- **Auth**: None
- **Payload**: `{ "email": "john@example.com" }`

### 1.8 Reset Password with OTP
- **Endpoint**: `POST /api/auth/forgot-password/reset`
- **Auth**: None
- **Payload**: `{ "email": "john@example.com", "otp": "1234", "newPassword": "newpassword123" }`

### 1.9 Get Profile
- **Endpoint**: `GET /api/auth/profile`
- **Auth**: 🔒 Bearer Token

### 1.10 Update Wallet
- **Endpoint**: `PUT /api/auth/wallet`
- **Auth**: 🔒 Bearer Token
- **Payload**: `{ "amount": 500, "type": "credit" }`

### 1.11 Save FCM Token (For Push Notifications)
- **Endpoint**: `POST /api/auth/fcm-token`
- **Auth**: 🔒 Bearer Token
- **Payload**: `{ "fcmToken": "abcdef123456..." }`

---

## 2. Services, Categories & App Data (`/api`)

### 2.1 Get All Categories
- **Endpoint**: `GET /api/categories`
- **Auth**: None

### 2.2 Get Subcategories
- **Endpoint**: `GET /api/categories/:categoryId/subcategories`
- **Auth**: None

### 2.3 Get All Services
- **Endpoint**: `GET /api/services`
- **Auth**: None

### 2.4 Get Service Details
- **Endpoint**: `GET /api/services/:id`
- **Auth**: None

### 2.5 Get Subscriptions
- **Endpoint**: `GET /api/subscriptions`
- **Auth**: None

### 2.6 Get Home Slides
- **Endpoint**: `GET /api/home-slides`
- **Auth**: None

### 2.7 Get App Settings
- **Endpoint**: `GET /api/settings`
- **Auth**: None

---

## 3. Global Search (`/api/search`)

### 3.1 Search Services & Products
- **Endpoint**: `GET /api/search`
- **Auth**: None
- **Query Params**: `?q=keyword&limit=30&offset=0`
- **Response**: `{ "results": [...], "total": 125, "hasMore": true }`

---

## 4. Shop (`/api/shop`)

### 4.1 Get Shop Products
- **Endpoint**: `GET /api/shop/products`
- **Auth**: None
- **Query Params**: `?category=Paints&limit=15&offset=0`

### 4.2 Get My Shop Orders
- **Endpoint**: `GET /api/shop/orders`
- **Auth**: 🔒 Bearer Token

### 4.3 Checkout Shop Order
- **Endpoint**: `POST /api/shop/checkout`
- **Auth**: 🔒 Bearer Token
- **Payload**:
  ```json
  {
    "addressId": 1,
    "paymentMethod": "cod",
    "items": [
      { "productId": "hammer-1", "quantity": 1 }
    ]
  }
  ```

### 4.4 Cancel Shop Order
- **Endpoint**: `PATCH /api/shop/orders/:id/cancel`
- **Auth**: 🔒 Bearer Token
- **Payload**: `{ "reason": "No longer needed" }`

---

## 5. Service Orders (`/api/orders`)

### 5.1 Get My Service Orders
- **Endpoint**: `GET /api/orders`
- **Auth**: 🔒 Bearer Token

### 5.2 Checkout Service
- **Endpoint**: `POST /api/orders/checkout`
- **Auth**: 🔒 Bearer Token
- **Payload**:
  ```json
  {
    "serviceId": "ac-general-service",
    "addressId": 1,
    "date": "2026-07-25",
    "time": "14:00",
    "paymentMethod": "easypaisa"
  }
  ```

### 5.3 Update Service Order
- **Endpoint**: `PUT /api/orders/:id`
- **Auth**: 🔒 Bearer Token
- **Payload**: `{ "date": "2026-07-26", "time": "15:00" }`

### 5.4 Cancel Service Order
- **Endpoint**: `PATCH /api/orders/:id/cancel`
- **Auth**: 🔒 Bearer Token
- **Payload**: `{ "reason": "Schedule conflict" }`

### 5.5 Upload Payment Receipt (Easypaisa/Bank)
- **Endpoint**: `POST /api/orders/:id/payment-receipt`
- **Auth**: 🔒 Bearer Token
- **Payload**: FormData containing an `image` file (e.g. screenshot of Easypaisa transfer).

---

## 6. Reviews (`/api`)

### 6.1 Get Reviews for a Service
- **Endpoint**: `GET /api/services/:serviceId/reviews`
- **Auth**: None

### 6.2 Submit a Review
- **Endpoint**: `POST /api/reviews`
- **Auth**: 🔒 Bearer Token
- **Payload**:
  ```json
  {
    "serviceId": "ac-general-service",
    "orderId": "ORD-123456",
    "rating": 5,
    "comment": "Excellent service!"
  }
  ```

---

## 7. Addresses (`/api/addresses`)

### 7.1 Get My Addresses
- **Endpoint**: `GET /api/addresses`
- **Auth**: 🔒 Bearer Token

### 7.2 Create Address
- **Endpoint**: `POST /api/addresses`
- **Auth**: 🔒 Bearer Token
- **Payload**:
  ```json
  {
    "title": "Home",
    "address": "123 Main St, Lahore",
    "lat": 31.5204,
    "lng": 74.3587
  }
  ```

### 7.3 Update Address
- **Endpoint**: `PUT /api/addresses/:id`
- **Auth**: 🔒 Bearer Token
- **Payload**: `{ "title": "Work", "address": "456 Office St" }`

---

## 8. Admin Panel (`/api/admin`)

### 8.1 Admin Auth
- **POST** `/api/admin/auth/login`: `{ "email": "admin@...", "password": "..." }`

### 8.2 Dashboard & Settings
- **GET** `/api/admin/summary`: Returns dashboard totals.
- **GET** `/api/admin/settings`: Get all app settings.
- **PUT** `/api/admin/settings`: Update app settings.
- **POST** `/api/admin/notifications/broadcast`: Send push notification `{ "title": "Promo!", "body": "Sale!" }`
- **POST** `/api/admin/uploads`: Upload an image to the server (Returns URL).

### 8.3 Users Management
- **GET** `/api/admin/users`: List all users.
- **DELETE** `/api/admin/users/:id`: Delete a user.

### 8.4 Service Orders Management
- **GET** `/api/admin/orders`: List all service orders.
- **GET** `/api/admin/orders/:id`: Get order details.
- **PATCH** `/api/admin/orders/:id/status`: Update status `{ "status": "processing" }`
- **GET** `/api/admin/payment-receipts`: List all uploaded payment receipts.

### 8.5 Services & Subscriptions Management
- **GET** `/api/admin/services`: List services.
- **POST** `/api/admin/services`: Create new service.
- **PUT** `/api/admin/services/:id`: Update a service.
- **GET** `/api/admin/subscriptions`: List subscriptions.
- **POST** `/api/admin/subscriptions`: Create subscription.
- **PUT** `/api/admin/subscriptions/:id`: Update subscription.
- **DELETE** `/api/admin/subscriptions/:id`: Delete subscription.

### 8.6 Home Slides Management
- **GET** `/api/admin/home-slides`: List home slides.
- **POST** `/api/admin/home-slides`: Create new slide.
- **PUT** `/api/admin/home-slides/:id`: Update slide.

### 8.7 Shop Management
- **GET** `/api/admin/shop/products`: List all products.
- **POST** `/api/admin/shop/products`: Create a product.
- **PUT** `/api/admin/shop/products/:id`: Update a product.
- **GET** `/api/admin/shop/orders`: List shop orders.
- **PATCH** `/api/admin/shop/orders/:id/status`: Update shop order status `{ "status": "shipped" }`

---

## 9. WhatsApp Bot (`/api/bot`, `/api/bookings`, `/api/sessions`)

### 9.1 Bot Control & Diagnostics
- **POST** `/api/bot/start`: Start the WhatsApp bot.
- **POST** `/api/bot/stop`: Stop the WhatsApp bot.
- **GET** `/api/bot/status`: Check if bot is running.
- **GET** `/api/bot/diagnostics`: Get detailed bot logs/diagnostics.
- **GET** `/api/bot/bookings-timeline`: Get timeline of recent bot activity.
- **GET** `/api/bot/stats`: Get bot statistics.

### 9.2 Bot Services Management
- **GET** `/api/bot/services`: List all services available via WhatsApp.
- **POST** `/api/bot/services`: Add a new service to the bot.
- **GET** `/api/bot/services/:id`: Get specific bot service.
- **PUT** `/api/bot/services/:id`: Update bot service.
- **DELETE** `/api/bot/services/:id`: Delete bot service.

### 9.3 Bot Bookings & Sessions
- **GET** `/api/bookings`: List all WhatsApp bookings.
- **PATCH** `/api/bookings/:id`: Update bot booking status `{ "status": "completed" }`
- **DELETE** `/api/bookings/:id`: Delete bot booking.
- **GET** `/api/sessions`: List active WhatsApp user sessions.

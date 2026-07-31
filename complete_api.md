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

### 11. Complaints (`/api/complaints`)

#### 11.1 Submit Complaint
- **Endpoint**: `POST /api/complaints`
- **Auth**: None
- **Payload**: `multipart/form-data` with `name`, `phone`, `service`, `email` (optional), `subService` (optional), `description` (optional), and `images` (optional array of files)
- **Response**: `{ "message": "...", "complaintId": 1 }`

#### 11.2 Get My Booked Services (For Dropdown)
- **Endpoint**: `GET /api/complaints/my-services`
- **Auth**: Bearer Token required
- **Response**: `{ "services": [{ "service": "AC Service", "sub_service": "Master Wash" }] }`



User: Submit a Complaint (Mobile/Web)
Endpoint: POST /api/complaints Format: multipart/form-data (Because of image uploads) Payload (Form Data):

name (Text, Required) - e.g. "John Doe"
phone (Text, Required) - e.g. "+923001234567"
service (Text, Required) - e.g. "AC Repair"
subService (Text, Optional) - e.g. "Gas Refill"
email (Text, Optional) - e.g. "john@example.com"
description (Text, Optional) - e.g. "The AC is still not cooling."
images (File Array, Optional) - Up to 5 image files.
2. User: Get My Complaints (Mobile/Web)
Endpoint: GET /api/complaints/me Headers: Authorization: Bearer <token> Payload: None Response:

json
{
  "complaints": [
    {
      "id": 1,
      "name": "John Doe",
      "phone": "+923001234567",
      "service": "AC Repair",
      "sub_service": "Gas Refill",
      "description": "The AC is still not cooling.",
      "images": ["/uploads/complaints/file1.jpg"],
      "status": "pending",
      "created_at": "2026-07-23T12:00:00Z"
    }
  ]
}
3. User: Get Past Booked Services (Mobile/Web Dropdown)
This is used to populate the dropdown on the "File a Complaint" screen. Endpoint: GET /api/complaints/my-services Headers: Authorization: Bearer <token> Payload: None Response:

json
{
  "services": [
    {
      "service": "AC Repair",
      "sub_service": "Gas Refill"
    }
  ]
}
4. Admin: Get All Complaints (Admin Dashboard)
Endpoint: GET /api/complaints Query Parameters (Optional):

limit (Number) - e.g. 20 (default)
offset (Number) - e.g. 0 (default)
status (String) - Filter by status (e.g., pending, resolved) Example: /api/complaints?limit=10&offset=0&status=pending Response:
json
{
  "complaints": [ ... ],
  "total": 42,
  "limit": 10,
  "offset": 0,
  "hasMore": true
}
5. Admin: Update Complaint Status (Admin Dashboard)
Endpoint: PATCH /api/complaints/:id/status Format: application/json Payload (JSON):

json
{
  "status": "in-review"
}
---

# Service Catalog API

Base URL: `{{baseUrl}}/api` (for example `http://localhost:5000/api`).

## Public / Mobile APIs

### Get full catalog

`GET /catalog`

The response is a main-category hierarchy. Use `subcategories` when present; otherwise use `directServices`.

```json
[
  {
    "id": "electrician",
    "title": "Electrician",
    "mainCategory": {
      "id": "electrician",
      "title": "Electrician",
      "mobileIconUrl": "https://...",
      "webImageUrl": "https://..."
    },
    "subcategories": [
      {
        "id": "sub-...",
        "title": "Fan Services",
        "imageUrl": "https://...",
        "services": [
          {
            "id": "svc-...",
            "title": "Fan Installation",
            "price": 800,
            "unitDescription": "Per ceiling fan",
            "serviceImageUrl": "https://..."
          }
        ]
      }
    ],
    "directServices": []
  }
]
```

### Get main categories

`GET /categories`

### Get a category's subcategories

`GET /categories/:categoryId/subcategories`

Example: `GET /categories/electrician/subcategories`

### Get services

`GET /services?categoryId=:categoryId`

Optional subcategory filter:

`GET /services?categoryId=:categoryId&subcategoryId=:subcategoryId`

### Get service details

`GET /services/:id`

## Admin APIs

### Get admin catalog

`GET /admin/catalogue`

### Create or update a main category

`POST /admin/categories`

```json
{
  "id": "electrician",
  "title": "Electrician",
  "subtitle": "Wiring, breakers, fans and electrical repairs",
  "icon": "lightning-bolt",
  "tint": "#F59E0B",
  "mobileIconUrl": "https://example.com/electrician-mobile.png",
  "webImageUrl": "https://example.com/electrician-desktop.jpg"
}
```

### Create or update a subcategory

`POST /admin/subcategories`

```json
{
  "id": "electrician-fan-services",
  "categoryId": "electrician",
  "title": "Fan Services",
  "description": "Installation and repair of ceiling and exhaust fans",
  "mobileIconUrl": "https://example.com/fan-mobile.png",
  "webImageUrl": "https://example.com/fan-desktop.jpg"
}
```

### Get all services for admin

`GET /admin/services`

### Create service

`POST /admin/services`

### Update service

`PUT /admin/services/:id`

Use this request body for create or update:

```json
{
  "categoryId": "electrician",
  "subcategoryId": "electrician-fan-services",
  "title": "Fan Installation",
  "description": "Professional ceiling fan installation.",
  "price": 800,
  "originalPrice": 800,
  "unitDescription": "Per ceiling fan",
  "duration": "60 min",
  "imageUrl": "https://example.com/fan-installation.jpg",
  "detailDescription": "Installation using the existing electrical point.",
  "includes": ["Fan mounting", "Electrical connection", "Safety test"],
  "details": ["Technician checks the existing power point"],
  "excludes": ["New wiring", "Fan cost"]
}
```

`serviceType` is accepted for older clients. New requests should use `unitDescription`.

## Spreadsheet import API

### Validate and preview a spreadsheet

`POST /admin/catalogue/import`

```json
{
  "dataUrl": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,PASTE_FILE_BASE64_HERE",
  "commit": false
}
```

Required spreadsheet columns:

- `Main Category`
- `Sub Category`
- `Service`
- `Price (PKR)`
- `Unit/Description`

Optional columns: `main category icon for moible`, `main category images for web / desktop`, `Sub category Image`, and `Services Images`.

### Import a validated spreadsheet

Use the same endpoint and payload, with `commit` set to `true`:

```json
{
  "dataUrl": "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,PASTE_FILE_BASE64_HERE",
  "commit": true
}
```

## Delete status

Catalog delete endpoints are not currently implemented. The following return no route:

```text
DELETE /admin/categories/:id
DELETE /admin/subcategories/:id
DELETE /admin/services/:id
```

Use an inactive/hidden state for catalog items when deletion safety is required.
## Catalog JSON examples

### `GET /api/catalog` response

```json
[
  {
    "id": "electrician",
    "title": "Electrician",
    "subtitle": "Wiring, breakers, fans and repairs",
    "mainCategory": {
      "id": "electrician",
      "title": "Electrician",
      "mobileIconUrl": "https://api.ustaadpro.pk/uploads/electrician-mobile.png",
      "webImageUrl": "https://api.ustaadpro.pk/uploads/electrician-web.jpg"
    },
    "subcategories": [
      {
        "id": "electrician-fan-services",
        "title": "Fan Services",
        "description": "Ceiling and exhaust fan services",
        "imageUrl": "https://api.ustaadpro.pk/uploads/fan-services.jpg",
        "services": [
          {
            "id": "fan-installation",
            "title": "Fan Installation",
            "description": "Professional fan installation.",
            "price": 800,
            "unitDescription": "Per ceiling fan",
            "serviceImageUrl": "https://api.ustaadpro.pk/uploads/fan-installation.jpg",
            "duration": "60 min"
          }
        ]
      }
    ],
    "directServices": []
  },
  {
    "id": "painter",
    "title": "Painter",
    "mainCategory": {
      "id": "painter",
      "title": "Painter",
      "mobileIconUrl": "https://api.ustaadpro.pk/uploads/painter-mobile.png",
      "webImageUrl": "https://api.ustaadpro.pk/uploads/painter-web.jpg"
    },
    "subcategories": [],
    "directServices": [
      {
        "id": "interior-wall-painting",
        "title": "Interior Wall Painting",
        "description": "Interior wall painting service.",
        "price": 500,
        "unitDescription": "Visit and inspection charges",
        "serviceImageUrl": "https://api.ustaadpro.pk/uploads/interior-painting.jpg",
        "duration": "60 min"
      }
    ]
  }
]
```

### Create main category

`POST /api/admin/categories`

```json
{
  "title": "Electrician",
  "subtitle": "Wiring, breakers, fans and repairs",
  "mobileIconUrl": "https://.../electrician-mobile.png",
  "webImageUrl": "https://.../electrician-web.jpg"
}
```

### Create subcategory

`POST /api/admin/subcategories`

```json
{
  "categoryId": "electrician",
  "title": "Fan Services",
  "description": "Ceiling and exhaust fan services",
  "mobileIconUrl": "https://.../fan-services-mobile.png",
  "webImageUrl": "https://.../fan-services-web.jpg"
}
```

### Create service

`POST /api/admin/services`

```json
{
  "categoryId": "electrician",
  "subcategoryId": "electrician-fan-services",
  "title": "Fan Installation",
  "price": 800,
  "unitDescription": "Per ceiling fan",
  "imageUrl": "https://.../fan-installation.jpg",
  "description": "Professional ceiling fan installation."
}
```

### Create direct service

Use `null` for `subcategoryId` when the service belongs directly to the main category.

`POST /api/admin/services`

```json
{
  "categoryId": "painter",
  "subcategoryId": null,
  "title": "Interior Wall Painting",
  "price": 500,
  "unitDescription": "Visit and inspection charges",
  "imageUrl": "https://.../interior-painting.jpg",
  "description": "Interior wall painting service."
}
```
---

# Payment receipts and wallet

Base URL: `https://api.ustaadpro.pk/api`

Every customer and admin endpoint below requires this header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

## 0. Create a service booking with a payment method

`POST /api/orders/checkout`

The backend accepts these exact payment-method values:

```json
{
  "fullPayment": "Full Payment in Advance",
  "advancePayment": "Rs 200 Advance"
}
```

### Full payment booking

```http
POST /api/orders/checkout
Authorization: Bearer CUSTOMER_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "cart": [
    {
      "service": {"id": "fan-installation"},
      "quantity": 1
    }
  ],
  "bookedFor": "FRI, Jul 31, 2026 - 02:00 PM",
  "paymentMethod": "Full Payment in Advance",
  "address": "Bahria Town Phase 3, Rawalpindi, Pakistan",
  "specialInstructions": "Please call before arrival",
  "recurringOccurrences": 1,
  "useRewardPoints": false
}
```

Example booking response:

```json
{
  "message": "Booking confirmed successfully",
  "order": {
    "id": "USTAADPRO-618044",
    "total": 2500,
    "status": "confirmed",
    "paymentMethod": "Full Payment in Advance"
  }
}
```

Then upload one receipt using `POST /api/orders/USTAADPRO-618044/payment-receipt` with the exact returned `order.total` as `amount`.

### Rs 200 advance booking

```json
{
  "cart": [
    {
      "service": {"id": "fan-installation"},
      "quantity": 1
    }
  ],
  "bookedFor": "FRI, Jul 31, 2026 - 02:00 PM",
  "paymentMethod": "Rs 200 Advance",
  "address": "Bahria Town Phase 3, Rawalpindi, Pakistan",
  "recurringOccurrences": 1,
  "useRewardPoints": false
}
```

### Upload the first Rs 200 receipt

`POST /api/orders/USTAADPRO-618044/payment-receipt`

```json
{
  "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "filename": "easypaisa-advance.jpg",
  "amount": 200
}
```

### Upload the remaining receipt after service completion

Only after the admin changes the order status to `completed`, upload the balance. For an order total of Rs. 2,500, the remaining amount is Rs. 2,300:

```json
{
  "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "filename": "easypaisa-remaining.jpg",
  "amount": 2300
}
```
## 1. Upload a full-payment receipt (customer)

Use this after creating an order with the **Full Payment** method. The amount must exactly equal the order total.

`POST /api/orders/:orderId/payment-receipt`

Example:

```http
POST /api/orders/USTAADPRO-618044/payment-receipt
Authorization: Bearer CUSTOMER_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "filename": "easypaisa-full-payment.jpg",
  "amount": 2500
}
```

Successful response:

```json
{
  "message": "Payment receipt uploaded successfully."
}
```

Rules:

- The logged-in customer must own `orderId`.
- A cancelled order cannot receive a receipt.
- For **Full Payment**, `amount` must equal the complete order total.
- For **Rs 200 Advance**, first submit `200`; after the admin marks the order `completed`, submit the remaining balance as a second receipt.

## 2. View customer bookings and receipt state

`GET /api/orders`

```http
GET /api/orders
Authorization: Bearer CUSTOMER_ACCESS_TOKEN
```

Example response fragment:

```json
[
  {
    "id": "USTAADPRO-618044",
    "status": "confirmed",
    "total": 2500,
    "paymentMethod": "Full Payment",
    "paymentReceipt": {
      "id": 41,
      "amount": 2500,
      "status": "submitted",
      "paymentStage": "full",
      "receiptUrl": "/uploads/payment-receipts/easypaisa-full-payment.jpg"
    }
  }
]
```

Receipt status values:

```json
{
  "submitted": "Customer uploaded proof; awaiting admin review.",
  "verified": "Admin approved the payment proof.",
  "rejected": "Admin rejected the proof; customer must upload a replacement."
}
```

## 3. Admin: list payment receipts

`GET /api/admin/payment-receipts`

```http
GET /api/admin/payment-receipts
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

Example response fragment:

```json
[
  {
    "id": 41,
    "orderId": "USTAADPRO-618044",
    "userId": 25,
    "amount": 2500,
    "status": "submitted",
    "paymentStage": "full",
    "receiptUrl": "/uploads/payment-receipts/easypaisa-full-payment.jpg",
    "orderStatus": "confirmed"
  }
]
```

## 4. Admin: verify or reject a receipt

`PATCH /api/admin/payment-receipts/:receiptId/status`

Verify a receipt:

```http
PATCH /api/admin/payment-receipts/41/status
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "status": "verified"
}
```

Reject a receipt:

```json
{
  "status": "rejected"
}
```

Successful response:

```json
{
  "message": "Receipt status updated. Verified cancelled payments are credited to the wallet once."
}
```

## 5. Wallet balance (customer)

`GET /api/auth/profile`

```http
GET /api/auth/profile
Authorization: Bearer CUSTOMER_ACCESS_TOKEN
```

Example response fragment:

```json
{
  "id": 25,
  "name": "Test Anis",
  "walletBalance": 2500,
  "coins": 0,
  "rewardPoints": 0
}
```

## Wallet refund security flow

There is deliberately **no customer API that can credit a wallet balance**.

A refund is created only when both conditions are true:

1. The customer cancels their eligible `confirmed` service order using `PATCH /api/orders/:orderId/cancel`.
2. An admin verifies at least one payment receipt using `PATCH /api/admin/payment-receipts/:receiptId/status` with `"status": "verified"`.

The backend then credits the sum of verified receipts to `walletBalance`. It writes a unique `wallet_transactions` record for `(order_id, cancellation_refund)`, so duplicate requests, refreshes, or repeated status updates cannot credit the same order twice.

Cancel order example:

```http
PATCH /api/orders/USTAADPRO-618044/cancel
Authorization: Bearer CUSTOMER_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "cancelReason": "I no longer need this service."
}
```

> Do not use `PUT /api/auth/wallet` from the mobile app for refunds or payments. Wallet credits must stay server-controlled. Wallet payment at checkout will use a separate server-side checkout endpoint when that feature is enabled.
---

# Booking lead-time / preferred-time API

The minimum lead time determines the earliest time a customer can select for a service booking. It applies to quick slots, custom time, checkout, and booking updates.

## Get the public booking setting (mobile app)

`GET /api/settings`

No authentication is required.

```http
GET https://api.ustaadpro.pk/api/settings
```

Example response:

```json
{
  "inspectionFee": 500,
  "serviceTaxPercent": 12,
  "minimumBookingLeadHours": 4,
  "currency": "PKR",
  "supportPhone": "+923001234567"
}
```

`minimumBookingLeadHours` is an integer from `0` to `168`.

- `0`: customer can choose any operational future slot today.
- `1`: customer can choose a slot at least one hour from now.
- `4`: customer can choose a slot at least four hours from now.

## Admin: update the booking lead time

`PUT /api/admin/settings`

```http
PUT https://api.ustaadpro.pk/api/admin/settings
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

Send the complete settings object. Example with a four-hour lead time:

```json
{
  "inspectionFee": 500,
  "serviceTaxPercent": 12,
  "minimumBookingLeadHours": 4,
  "currency": "PKR",
  "supportPhone": "+923001234567",
  "shippingCost": 200,
  "rewardEnabled": true,
  "rewardPointValue": 25,
  "rewardMinimumRedeem": 100,
  "serviceRewardPointsOnCompletion": 1,
  "serviceRewardMaxDiscountPercent": 10,
  "shopRewardEarnPercent": 0.5,
  "shopRewardMaxDiscountPercent": 5
}
```

Successful response:

```json
{
  "inspectionFee": 500,
  "serviceTaxPercent": 12,
  "minimumBookingLeadHours": 4,
  "currency": "PKR"
}
```

## Checkout enforcement

When a customer submits an earlier booking time, the backend rejects it even if they use an old mobile app or call the API directly.

`POST /api/orders/checkout`

Example failed response (`400 Bad Request`):

```json
{
  "message": "Please choose a time at least 4 hour(s) from now."
}
```

The same validation also applies to:

`PUT /api/orders/:orderId`

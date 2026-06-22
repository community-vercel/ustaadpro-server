# UstaadPro (Theka Online) Backend Server

Express.js server with PostgreSQL database to support the UstaadPro mobile application.

## Prerequisites

- [Node.js](https://nodejs.org/) (Version >= 18)
- [PostgreSQL](https://www.postgresql.org/)

## Getting Started

### 1. Installation
Navigate into this folder and install dependencies:
```bash
cd ustaadpro_server
npm install
```

### 2. Configure Database Connection
Create a copy of `.env` or edit the existing one to reflect your PostgreSQL configuration:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=ustaadpro_db
JWT_SECRET=ustaadpro_super_secret_key_123!
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="UstaadPro <no-reply@example.com>"
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_PHONE=+1234567890
```

Ensure a PostgreSQL database named `ustaadpro_db` exists on your server. You can create it manually:
```sql
CREATE DATABASE ustaadpro_db;
```

### 3. Initialize Schema & Seed Data
Run the PostgreSQL schema script:
```bash
npm run schema
```

Then, run the node seeding script to prepopulate categories, services, and subscription plans in the database:
```bash
npm run seed
```

### Migrating Existing MySQL Data
Keep your old MySQL connection in `.env` using `MYSQL_*` keys and point the normal `DB_*` keys at PostgreSQL:
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=ustaadpro_db

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=ustaadpro_db
```

Then run:
```bash
npm run migrate:mysql-to-postgres
```

The migration script rebuilds the PostgreSQL schema, copies current MySQL data table-by-table, and resets PostgreSQL ID sequences.

### 4. Run the Server
To run the server in development mode (with auto-reload via `nodemon`):
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```

---

## API Endpoints Reference

### Authentication (Public & Protected)

#### Signup: `POST /api/auth/signup`
Starts signup and sends a 6 digit verification code by phone or email. The user is created only after OTP verification.
- **Payload**:
  ```json
  {
    "name": "Ahsan",
    "phone": "+923001234567",
    "email": "ahsan@example.com",
    "password": "my_secure_password",
    "verificationChannel": "phone"
  }
  ```
- **Response**: confirmation message, normalized phone/email, selected channel, and expiry window.

#### Verify Signup OTP: `POST /api/auth/verify-signup-otp`
Verifies the 6 digit phone/email code and creates the user. Default values: `walletBalance: 5200`, `coins: 1280`.
- **Payload**:
  ```json
  {
    "phone": "+923001234567",
    "email": "ahsan@example.com",
    "code": "123456",
    "verificationChannel": "phone"
  }
  ```
- **Response**: JWT `token` and user profile details.

#### Login: `POST /api/auth/login`
Authenticates with email and password.
- **Payload**:
  ```json
  {
    "email": "ahsan@example.com",
    "password": "my_secure_password"
  }
  ```
- **Response**: JWT `token` and user profile details.

#### Request Phone Login OTP: `POST /api/auth/request-login-otp`
Sends a 6 digit login code to a registered phone number.
- **Payload**:
  ```json
  {
    "phone": "+923001234567"
  }
  ```

#### Verify Phone Login OTP: `POST /api/auth/verify-login-otp`
Verifies the phone login code and signs the user in.
- **Payload**:
  ```json
  {
    "phone": "+923001234567",
    "code": "123456"
  }
  ```
- **Response**: JWT `token` and user profile details.

#### Profile Details: `GET /api/auth/profile` (Protected)
- **Headers**: `Authorization: Bearer <your_jwt_token>`
- **Response**: Logged in user profile data.

#### Topup / Edit Wallet: `PUT /api/auth/wallet` (Protected)
- **Headers**: `Authorization: Bearer <your_jwt_token>`
- **Payload**: Adjusts wallet balance or loyalty coins:
  ```json
  {
    "amount": 2000,
    "coins": 100
  }
  ```

---

### Services & Subscriptions (Public)

#### Categories: `GET /api/categories`
- **Response**: Array of service categories (Home, Cleaning, Salon, etc.).

#### Services: `GET /api/services`
- **Query Params (Optional)**: `categoryId=home` (filters by category ID)
- **Response**: Array of services matching the query.

#### Service Details: `GET /api/services/:id`
- **Response**: Specific service details, including lists of features `includes` and exclusions `excludes`.

#### Subscriptions: `GET /api/subscriptions`
- **Response**: Available monthly and quarterly subscription plans.

---

### Orders & Checkout (Protected)

#### Checkout: `POST /api/orders/checkout`
Verifies cart items, checks user wallet balance, updates the database, deducts total price from wallet, awards coins, and returns the generated order.
- **Headers**: `Authorization: Bearer <your_jwt_token>`
- **Payload**:
  ```json
  {
    "cart": [
      {
        "service": { "id": "ac-general-service" },
        "quantity": 1
      }
    ],
    "bookedFor": "Tomorrow, 4:00 PM"
  }
  ```
- **Response**: Success details, generated order, updated wallet balance and coins.

#### Order History: `GET /api/orders`
Lists all historic orders placed by the authenticated user, sorted by date.
- **Headers**: `Authorization: Bearer <your_jwt_token>`
- **Response**: List of populated order objects.

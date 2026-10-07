# REST API Reference — Radhe Traders Platform

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000` (Local) / Production Domain  
**Authentication:** Cookie (`radhe_session` / `radhe_customer_session`) or Bearer Token (`Authorization: Bearer <JWT>`)

---

## 1. Authentication & Sessions

### Staff Authentication

#### `POST /api/auth/login`
Authenticates Admin or Worker staff.
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "identifier": "admin",      // Username, email, or phone
    "password": "admin123"
  }
  ```
- **Responses:**
  - `200 OK`: Sets `radhe_session` HTTP-only cookie and returns user profile & token.
    ```json
    {
      "user": {
        "id": "cuid...",
        "username": "admin",
        "email": "admin@example.com",
        "name": "System Admin",
        "role": "ADMIN"
      },
      "token": "eyJhbGciOi..."
    }
    ```
  - `401 Unauthorized`: Invalid credentials.
  - `429 Too Many Requests`: Rate limit exceeded (5 attempts/min).

#### `GET /api/auth/me`
Retrieves current staff session.
- **Headers:** Cookie or `Authorization: Bearer <token>`
- **Response `200 OK`:** `{ "user": { ... } }`
- **Response `401 Unauthorized`:** `{ "user": null }`

#### `POST /api/auth/logout`
Clears session cookie and invalidates client session.

---

### Customer Authentication (OTP Based)

#### `POST /api/customer/auth/send-otp`
Sends 6-digit verification OTP to a customer phone number.
- **Request Body:** `{ "phone": "+919876543210" }`
- **Response `200 OK`:** `{ "success": true, "message": "OTP sent" }`

#### `POST /api/customer/auth/verify-otp`
Verifies OTP and issues customer session token.
- **Request Body:** `{ "phone": "+919876543210", "code": "123456" }`
- **Response `200 OK`:** `{ "user": { ... }, "token": "..." }`

---

## 2. Catalog & Products

#### `GET /api/products`
Lists products with optional category filtering and search.
- **Query Params:** `category`, `search`, `limit`, `page`
- **Security:** Public requests receive sanitized price/stock; wholesale cost (`costPrice`) is stripped unless authenticated as `ADMIN`.
- **Response `200 OK`:** `{ "products": [ ... ], "total": 12 }`

#### `POST /api/products` (Admin Only)
Creates a new product catalog entry.
- **Permissions:** `ADMIN` role required.
- **Request Body:**
  ```json
  {
    "name": "M-30 Sugar",
    "category": "Sweeteners",
    "price": 43,
    "costPrice": 38,
    "stock": 1000,
    "unit": "kg",
    "hsnCode": "17019990",
    "gstRate": 5
  }
  ```

#### `PATCH /api/products/:id` (Admin Only)
Updates pricing, stock levels, or specifications.

---

## 3. Orders & Packing Queue

#### `GET /api/orders`
Retrieves orders.
- **Query Params:** `status`, `type` (`WEB` | `WALK_IN`), `queue=true` (Worker packing view)
- **Permissions:** Staff access required (`ADMIN` or `WORKER`).

#### `POST /api/orders`
Creates a web order or staff walk-in draft.
- **Request Body:**
  ```json
  {
    "customerName": "Ramesh Kumar",
    "customerPhone": "+919876543210",
    "type": "WEB",
    "items": [
      { "productId": "cuid...", "quantity": 50, "price": 43 }
    ]
  }
  ```

#### `PATCH /api/orders/:id`
Updates order status (`PENDING` -> `PACKING` -> `DELIVERED`).
- **Security:** Workers cannot alter total amount or product pricing (strictly 403 Forbidden).

---

## 4. ERP Operations & Financials

#### `GET /api/dashboard`
Aggregated sales metrics, orders counts, and low-stock alerts.
- **Permissions:** `ADMIN` only.

#### `GET /api/erp/invoices`
Lists generated GST Tax Invoices.
- **Permissions:** `ADMIN` only.

#### `POST /api/erp/invoices`
Generates a formal Tax Invoice and enqueues PDF creation and SMS/WhatsApp alert.

#### `GET /api/erp/transport`
Lists Delivery Challans for physical goods transport.

#### `GET /api/erp/ledger`
Double-entry general ledger accounts and journal posting history.

#### `GET /api/erp/customers`
Wholesale customer directory with credit balance and GSTIN details.

---

## 5. Stock Movements & Logistics

#### `POST /api/stock-arrivals`
Records incoming stock from suppliers/mills.

#### `POST /api/stock-adjustments` (Admin Only)
Adjusts physical inventory count for shrinkage, damage, or audit corrections.

#### `POST /api/stock-requests`
Worker requests stock from godown/warehouse.

---

## 6. Hardware & Integration Endpoints

#### `POST /api/qr/generate`
Generates dynamic QR codes (data URL) for invoices and products.

#### `POST /api/upload`
Uploads product photos or company documents to `/public/uploads`.

#### `POST /api/webhooks/idfc`
Receives payment gateway callback notifications with HMAC-SHA256 signature verification.

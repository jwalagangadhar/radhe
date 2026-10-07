# Authentication & Security Architecture — Radhe Traders Platform

**Version:** 1.0.0  
**Libraries:** `jose` (JWT), `bcryptjs` (Password Hashing), Next.js 16 Edge Proxy (`src/proxy.ts`)

---

## 1. Dual-Track Authentication Overview

The platform implements two distinct, isolated authentication channels:
1. **Staff Enterprise Portal (`radhe_session`):**
   - Credentials-based (`username`, `email`, or `phone` + `password`).
   - Role-Based Access Control (`ADMIN` vs `WORKER`).
   - Standard 8-hour shift duration.
2. **Customer Storefront (`radhe_customer_session`):**
   - Passwordless phone OTP authentication.
   - Long-lived session (30 days) stored via Secure Cookie and Context.

---

## 2. Staff Authentication & RBAC

### Supported Identifiers
Users can authenticate using any of the following formats:
- **Username:** `admin`, `worker`
- **Email:** `admin@example.com`, `worker@example.com`
- **Phone:** `+919876543210`, `9876543210`

### Role Hierarchy & Permissions
| Endpoint / Resource | Public | Worker | Admin |
|:---|:---:|:---:|:---:|
| `/` (Storefront) | ✅ | ✅ | ✅ |
| `/portal/login` | ✅ | ✅ | ✅ |
| `/portal/worker/*` (Packing, Queues, Walk-in Orders) | ❌ | ✅ | ✅ |
| `/portal/admin/*` (Dashboard, GST Invoicing, Ledger) | ❌ | ❌ (403) | ✅ |
| `/api/products` (Wholesale Cost Price `costPrice`) | Sanitized | Sanitized | ✅ Visible |
| `/api/orders/:id` (Price & Total Modification) | ❌ | ❌ (403) | ✅ Allowed |
| `/api/workers` (Staff Management) | ❌ | ❌ (403) | ✅ Allowed |

---

## 3. Edge Proxy Route Protection (`src/proxy.ts`)

Next.js 16 replaces `middleware.ts` with `src/proxy.ts`. It executes before routes are rendered:
- **CORS Handling:** Automatically injects CORS headers for mobile Expo clients (`localhost:8081`).
- **Cryptographic Token Verification:** Verifies HS256 JWT using `process.env.JWT_SECRET`.
- **Dynamic `returnUrl`:** When an unauthenticated user attempts to access `/portal/admin/inventory`, the proxy redirects to `/portal/login?returnUrl=/portal/admin/inventory`, preserving their navigation destination.
- **Access Denied Redirection:** If a Worker accesses `/portal/admin`, they are redirected to `/portal/access-denied`.
- **Legacy Route Aliases:** Automatically routes `/admin` and `/worker` to `/portal/admin` and `/portal/worker`.

---

## 4. Rate Limiting & Anti-Brute Force (`src/lib/rate-limit.js`)

- Implemented using an in-memory sliding window bucket.
- **Limit:** Maximum 5 failed login attempts per 1-minute window per IP + user combination.
- **Lockout Response:** Returns `429 Too Many Requests` with a `Retry-After` response header.
- **Reset:** Automatically resets upon successful credential verification.

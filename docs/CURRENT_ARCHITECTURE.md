# Current Architecture Document — Radhe Traders Platform

**Document Version:** 1.0.0  
**Generated Date:** September 2026  
**Status:** Audited & Verified  

---

## 1. Executive Architecture Overview

The Radhe Traders project is a unified commercial trading and wholesale/retail grocery platform built as an integrated multi-tier application. It powers:
1. **Public Customer Storefront (Web):** Catalog browsing, cart management, checkout, order tracking.
2. **Staff ERP & Operations Portal (Web):**
   - **Admin Portal:** Sales analytics, wholesale GST invoicing, cash counter non-GST billing, transport delivery challans, double-entry general ledger, GSTR-1 compliance reporting, supplier arrivals, product pricing, and staff management.
   - **Worker Portal:** Packing and dispatch queues, physical stock arrivals/additions, stock request workflows, quick walk-in order drafting.
3. **Cross-Platform Mobile Application (Android / iOS):** Expo Router v4 / React Native application consuming the backend REST API via Bearer token authentication.

```
                          ┌────────────────────────────┐
                          │   Public Web Customer      │
                          │   (/, /products, /cart)    │
                          └─────────────┬──────────────┘
                                        │ HTTP / JSON
                                        ▼
┌─────────────────────────┐    ┌────────────────────────┐    ┌─────────────────────────┐
│  Mobile App (Expo RN)   │───▶│   Next.js 16 Web/API   │◀───│   Web Staff Portal      │
│  (Admin & Worker Apps)  │    │  (App Router + Proxy)  │    │  (/portal/admin & worker)│
└─────────────────────────┘    └───────────┬────────────┘    └─────────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                        ▼                                     ▼
             ┌─────────────────────┐               ┌─────────────────────┐
             │   Prisma ORM (v6)   │               │   External Services │
             │ (SQLite / Postgres) │               │   - Twilio (SMS/WA) │
             └─────────────────────┘               │   - PDFKit/pdf-lib  │
                                                   └─────────────────────┘
```

---

## 2. Technology Stack & Framework Inventory

| Tier | Component | Technology & Version | Role |
| :--- | :--- | :--- | :--- |
| **Web Runtime** | Core Framework | Next.js `16.2.9` (App Router) | Full-stack server, SSR/RSC, API routes, routing |
| **Frontend UI** | React Core | React `19.2.4` + React DOM `19.2.4` | Component state, hydration, UI rendering |
| **Styling** | CSS Engine | Tailwind CSS `v4` (`@tailwindcss/postcss`) | Utility classes, responsive design, dark mode |
| **Mobile** | Native Client | Expo `~52.0.30` + React Native `0.76.7` | Cross-platform mobile (Android & iOS) |
| **Mobile Nav** | Router | Expo Router `~4.0.17` | File-system routing for mobile screens |
| **Database** | ORM / Engine | Prisma Client `^6.9.0` + SQLite (`dev.db`) | Relational persistence, schema migrations |
| **Security** | Auth & Crypto | `jose` `^6.0.11`, `bcryptjs` `^3.0.2` | JWT sign/verify, password hashing |
| **Documents** | Invoicing / PDF | `pdf-lib` `^1.17.1`, `pdfkit` `^0.14.0` | Server-side Tax Invoice & Delivery Challan generation |
| **Hardware** | Barcode / QR | `qrcode` `^1.5.1`, `html5-qrcode` `^2.3.8` | Label printing, in-browser camera barcode scanning |
| **Messaging** | SMS & WhatsApp | `twilio` `^5.7.1` | Order alerts, customer invoice notifications |
| **Validation** | Input schemas | `zod` `^3.25.67` | Request validation |

---

## 3. Request Flow & Execution Lifecycle

The platform implements an explicit multi-stage request flow:

```
[ Client: Web Browser / Expo Mobile ]
                 │
                 ▼
[ 1. Next.js Routing & Edge Proxy (`src/proxy.ts`) ]
     • URL Path matching: `/portal/*`, `/admin/*`
     • Cookie extraction (`radhe_session`)
     • JWT cryptographic verification (`jose`)
     • Role guard: Redirects unauthenticated to `/portal/login`
     • Role guard: Blocks non-ADMIN users from `/portal/admin` (redirects to `/portal/access-denied`)
                 │
                 ▼
[ 2. Route Handler / Server Component ]
     • In `/api/*`: CSRF origin verification (`validateCsrf()`)
     • Bearer Token OR Cookie Session resolution (`requireAuth()`)
     • Role authorization check (`ADMIN`, `WORKER`)
                 │
                 ▼
[ 3. Business Service & Calculation Engine ]
     • Tax computation: Intra-state vs. Inter-state (`src/lib/erp-engine.ts`)
     • Margin protection: Wholesale cost stripped for non-admin callers
     • Invoice sequencing: `INV-YYYY-XXXX` atomic sequence
     • Ledger double-entry posting: `JournalEntry` + `JournalPosting`
                 │
                 ▼
[ 4. Data Access Layer (Prisma ORM) ]
     • Prisma Client singleton (`src/lib/db.ts`)
     • Model transactions (`$transaction`) for order checkout and stock updates
                 │
                 ▼
[ 5. Persistence Tier ]
     • SQLite database (`prisma/dev.db`) / Production PostgreSQL
                 │
                 ▼
[ 6. Asynchronous Background Pipelines ]
     • `enqueueBackgroundTasks()` (`src/lib/background.ts`)
     • Generates Invoice & Challan PDF buffers to `public/uploads/invoices`
     • Dispatches Twilio SMS notifications to customer & WhatsApp alerts to owner
```

---

## 4. Frontend Architecture

### 4.1 Route Hierarchy
- **Storefront Group (`src/app/(customer)`):**
  - `/`: Storefront landing, featured groceries, hero banners.
  - `/products`: Searchable, categorized catalog with active filter tabs.
  - `/about`: Company heritage and wholesale facilities.
  - `/cart`: Cart drawer / page with live quantity adjustments.
  - `/checkout`: Multi-step customer checkout (name, phone, delivery address, optional GST).
  - `/order-success`: Dynamic order confirmation page with status badge.
  - `/track`: Public self-service order tracking using order number and customer phone.
- **Staff Portal (`src/app/portal`):**
  - `/portal/login`: Unified credentials login for Admin and Worker.
  - `/portal/access-denied`: Fallback screen for unauthorized role attempts.
  - `/portal/admin`: Executive dashboard with revenue metrics and quick actions.
  - `/portal/admin/orders`: Order management, status pipeline, invoice downloads.
  - `/portal/admin/take-order`: Wholesale GST order engine with customer credit limits.
  - `/portal/admin/cash-counter`: Fast POS billing for walk-in retail non-GST customers.
  - `/portal/admin/inventory`: Stock ledger, low-stock thresholds, barcode printing.
  - `/portal/admin/arrivals`: Raw stock intake from millers/suppliers with transport LR numbers.
  - `/portal/admin/stock-requests`: Approval queue for worker packaging requests.
  - `/portal/admin/settings`: Business details, GSTIN, bank UPI credentials, staff accounts.
  - `/portal/worker`: Worker landing page.
  - `/portal/worker/queue`: Real-time order fulfillment & packaging list.
  - `/portal/worker/history`: Fulfilled orders audit history.
  - `/portal/worker/quick-order`: Rapid customer order draft entry.
  - `/portal/worker/stock`: Bulk-to-retail pack conversion request creator.

### 4.2 Frontend Components (`src/components/`)
- `CustomerNav.tsx` & `PortalNav.tsx`: Contextual navigation headers with role badges.
- `CartProvider.tsx`: React Context cart manager synchronized with localStorage.
- `ProductCard.tsx` & `OrderCard.tsx`: Reusable cards for customer and internal lists.
- `BarcodeScannerModal.tsx`: Live camera video stream barcode decoder using `html5-qrcode`.
- `BarcodeLabelModal.tsx`: Print-ready thermal barcode label renderer.
- `StockAlertsPanel.tsx` & `LowStockAlertsPanel.tsx`: Inventory warning panels.
- `WorkerStockAdditionPanel.tsx` & `AdminStockApprovalPanel.tsx`: Stock conversion approval modules.
- `erp/GstBillingModule.tsx`: B2B GST Wholesale billing calculator.
- `erp/CashCounterBilling.tsx`: High-speed keyboard-driven non-GST POS.
- `erp/LedgerViewer.tsx`: General Ledger accounts and journal entries viewer.
- `erp/ComplianceExporter.tsx`: GSTR-1 and GSTR-3B tax export dialog.
- `erp/TransportDispatchModule.tsx`: Delivery challan dispatcher with vehicle number tracking.
- `erp/PrintControllerModal.tsx`: Multi-copy invoice print dialog.

---

## 5. Backend & API Architecture

The backend consists of 36 Next.js Route Handlers located under `src/app/api/`:

```
src/app/api/
├── auth/
│   ├── login/route.ts          # Credentials verification, rate limiting, JWT issuance
│   ├── logout/route.ts         # Session cookie deletion & invalidation
│   └── me/route.ts             # Active session identity & role verification
├── checkout/route.ts           # Customer public checkout with inventory lock
├── dashboard/
│   ├── route.ts                # Revenue, orders count, stock valuations
│   └── low-stock-alerts/route.ts
├── erp/
│   ├── cash-bills/route.ts     # Cash Counter non-GST bill generation
│   ├── compliance/route.ts     # GSTR-1 / GSTR-3B export builder
│   ├── customers/route.ts      # B2B customer master & credit limits
│   ├── invoices/route.ts       # GST Tax invoices & payment statuses
│   ├── ledger/route.ts         # Double-entry ledger accounts & journal entries
│   ├── metrics/route.ts        # Comprehensive sales & margins metrics
│   ├── orders/route.ts         # Full B2B wholesale order processing
│   ├── payments/route.ts       # Invoice payments & ledger posting
│   └── transport/route.ts      # Delivery challans & transporter LR numbers
├── invoices/route.ts           # Standalone invoice queries & PDF links
├── messages/route.ts           # Internal staff announcements
├── notifications/route.ts      # Real-time alert polling & marking as read
├── orders/
│   ├── route.ts                # Order listing & filtering
│   ├── create/route.ts         # Order creation
│   ├── export/route.ts         # CSV export for accounting
│   ├── track/route.ts          # Public customer order tracking
│   └── [id]/
│       ├── route.ts            # Order status mutations & updates
│       └── send-sms/route.ts   # On-demand SMS invoice resend
├── products/
│   ├── route.ts                # Product catalog (sanitizes wholesale cost)
│   ├── active-orders/route.ts  # Products pending fulfillment
│   ├── sales-stats/route.ts    # Velocity and sales statistics per product
│   └── [id]/route.ts           # Product CRUD & pricing adjustments
├── qr/generate/route.ts        # Dynamic UPI payment QR generation
├── stock-additions/route.ts    # Worker stock additions
├── stock-adjustments/route.ts  # Physical breakage/wastage audit adjustments
├── stock-arrivals/route.ts     # Inward bulk stock shipments
├── stock-requests/route.ts     # Bulk packaging request workflow
├── upload/route.ts             # Secure image upload (magic bytes, crypto names)
├── webhooks/idfc/route.ts      # Bank payment webhook handler (stub/disabled)
└── workers/route.ts            # Staff account management
```

---

## 6. Database Architecture (`prisma/schema.prisma`)

- **ORM:** Prisma Client with SQLite (`file:./dev.db`) in development, portable to PostgreSQL.
- **Core Entities & Relationships:**
  - `User`: Staff accounts (`ADMIN`, `WORKER`) with hashed passwords.
  - `Customer`: B2B clients with state codes, GSTIN, credit limits, balances.
  - `Product`: Catalog items with pricing tiers (`price`, `costPrice`, `counterPrice`, `counterGstPrice`, `webPrice`), inventory stocks (`stock`, `unpackedStock`), HSN code, GST rate, barcode.
  - `Order` & `OrderItem`: Orders linked to customer and createdBy staff, with line-item GST calculations.
  - `Invoice`: Formal Tax Invoices linked 1-to-1 with Orders, recording grand totals, round-off, and payment status.
  - `DeliveryChallan`: Goods transport records with LR number, vehicle number, and e-way bill.
  - `LedgerAccount`, `JournalEntry`, `JournalPosting`: True double-entry bookkeeping system.
  - `PaymentRecord` & `PaymentLog`: Recorded payments with payment mode (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`).
  - `StockArrival`: Raw shipment arrival tracking from millers/suppliers.
  - `StockAddition` & `StockRequest`: Multi-step packaging approval pipeline.
  - `StockAdjustment`: Audit trail for inventory corrections.
  - `CompanySettings`: Central business entity details (GSTIN, PAN, bank accounts, UPI ID).
  - `Notification` & `Message`: Internal staff communication and low-stock alerts.

---

## 7. Authentication & Authorization Security Model

1. **Authentication:**
   - Stateless JWT tokens signed via HS256 (`jose`) with 8-hour expiry.
   - Dual-transport:
     - Web: Stored in an `HttpOnly`, `SameSite=lax`, `secure` (in prod) cookie named `radhe_session`.
     - Mobile & API: Transmitted in standard `Authorization: Bearer <token>` header.
2. **Authorization & RBAC:**
   - Server-side route authorization via `requireAuth(['ADMIN'])` or `requireAuth(['ADMIN', 'WORKER'])`.
   - Edge Proxy (`src/proxy.ts`) prevents unauthorized page loads in Next.js before rendering.
   - Role Isolation: Workers cannot view Admin dashboards, ERP metrics, general ledgers, or modify product prices or staff.
   - Data Protection: `costPrice` (wholesale margin) is strictly omitted from product queries for public customers and workers, returned only to authenticated Admins.
3. **Network & Request Security:**
   - CSRF origin checking (`validateCsrf()`) on all state-changing HTTP methods.
   - Rate limiting on authentication (`src/lib/rate-limit.ts`) allowing 5 attempts per minute per IP/identifier.
   - File upload validation with MIME check, extension allowlist, and binary magic-byte inspection.
   - Next.js HTTP security headers (HSTS, X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, DNS Prefetch).

---

## 8. Mobile Application Architecture (`mobile/`)

- **Framework:** Expo 52 with Expo Router v4 and React Native 0.76.7.
- **Architecture:**
  - `mobile/app/_layout.tsx`: Root stack provider with `AuthContext`.
  - `mobile/app/login.tsx`: Native login screen.
  - `mobile/app/(admin)/*`: Admin navigation tabs and screens (Dashboard, Orders, Products, Stock, Customers, ERP, Settings).
  - `mobile/app/(worker)/*`: Worker navigation tabs and screens (Dashboard, Orders, Order Details).
  - `mobile/src/api/client.ts`: Robust API client featuring:
    - Base URL configuration via `EXPO_PUBLIC_API_URL`.
    - Token storage via `expo-secure-store`.
    - Automatic `Bearer` token and `radhe_session` cookie attachment.
    - Automatic session expiry detection (401 handler clears secure storage).
    - AbortController timeout handling (15-second default).
    - Explicit network failure error classification.
- **Platforms Supported:**
  - Android (Package: `com.radhetraders.app`)
  - iOS (Bundle ID: `com.radhetraders.app`)

---

## 9. External Integrations & Services

1. **Twilio (`src/lib/notifications.ts`):**
   - WhatsApp order alerts to the business owner via Twilio WhatsApp API.
   - SMS dispatch to store owners and customers for order confirmations and invoices.
   - Fallback graceful logging when credentials are unset in local development.
2. **IDFC First Bank Payment Gateway (`src/lib/idfc.ts`):**
   - Cryptographic HMAC-SHA256 signature generation for dynamic UPI QR and checkout sessions.
   - Webhook signature verification logic.
3. **PDF Generation Engines (`src/lib/pdf.ts`):**
   - Generates compliant Tax Invoices and Delivery Challans using `pdf-lib`.
   - Embeds UPI QR codes, company GSTIN, and itemized tax tables.
   - Stores output in `public/uploads/invoices/` and `public/uploads/challans/`.

---

## 10. Audit Findings & Refactoring Opportunities

During our thorough audit, the following specific issues and non-destructive refactoring opportunities were identified:

1. **Linting & Code Quality:**
   - TypeScript compilation (`tsc --noEmit`) passes with **0 errors**.
   - Mobile TypeScript compilation passes with **0 errors**.
   - ESLint (`npm run lint`) reported errors primarily consisting of `@typescript-eslint/no-explicit-any` casts and unused variables in ERP components and utility files, and missing `mobile/**` ignore in `eslint.config.mjs`.
2. **Duplicate Code:**
   - `src/lib/pdf-lib.ts` is an exact duplicate of `src/lib/pdf.ts` and is not imported by any file.
3. **Displaced Test & Utility Scripts in Root & Scratch:**
   - `test-pdf.ts` and `regenerate-pdf.ts` are located directly in the project root.
   - `scratch/` contains active and valuable integration test suites (`test-auth-flows.ts`, `test-mobile-api.ts`, `test-admin-cash-counter.ts`, `check-db.js`). These should be properly organized into `scripts/` and `tests/`.
4. **Documentation Gaps:**
   - The repository lacked standard architecture, API, database, and security documentation.
5. **Next.js 16 File Conventions:**
   - `src/proxy.ts` is the official Next.js 16 file convention replacing `middleware.ts`. This must be preserved as `src/proxy.ts`.

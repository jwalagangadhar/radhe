# Rajyalakshmi Radhe — Commercial ERP & Grocery Platform

A comprehensive multi-tier trading and wholesale/retail platform for **Rajyalakshmi Traders** (Vijayawada):
- **Public Customer Storefront (`/`)**: Product catalog, category browsing, cart, checkout, OTP customer login, and real-time order tracking.
- **Enterprise Staff Portal (`/portal/login`)**: Role-Based Access Control (`ADMIN` vs `WORKER`), Wholesale GST Invoicing, Shop Counter Non-GST Billing, Delivery Challans, Inventory & Stock arrivals, and Double-Entry General Ledger.
- **Cross-Platform Mobile App (`mobile/`)**: Native Expo Router v4 Android/iOS application communicating via Bearer token REST API.
- **Automated Messaging & Notifications**: Instant Twilio SMS and WhatsApp notifications with background PDF generation.

---

## 1. Quick Start

### Web Application & API
```bash
# Install dependencies
npm install

# Initialize database & seed initial catalog and accounts
npm run db:setup

# Start development server
npm run dev
# Server available at http://localhost:3000
```

### Mobile Application (Android / iOS)
```bash
# Start Android dev client
npm run android

# Or launch Expo bundler interactive menu
npm --prefix mobile run start
```

---

## 2. Staff Demo Credentials

The Staff Portal (`/portal/login`) provides **1-click Quick Login chips** for instant access:

| Role | Username | Password | Email | Description |
|:---|:---|:---|:---|:---|
| **Admin** | `admin` | `admin123` | `admin@example.com` | Full ERP, Invoicing, Ledger, Analytics & Pricing |
| **Worker** | `worker` | `worker123` | `worker@example.com` | Packing Queue, Stock Requests, Walk-in Drafts |

*Note: Staff can log in using their **Username**, **Email**, or **Phone Number** (`+919876543210`).*

---

## 3. Automated Test Suites & Quality Commands

All test suites and quality gates can be run from the root directory:

```bash
# Run all role-based auth & route guard integration tests
npm run test:auth

# Run complete 20-point mobile API & defensive security test suite
npm run test:mobile

# Run Admin cash counter & wholesale billing verification
npm run test:billing

# Validate server-side Tax Invoice PDF generation
npm run test:pdf

# Inspect current orders in the database
npm run db:check

# Run full TypeScript compiler verification (0 errors)
npx tsc --noEmit

# Run ESLint check
npm run lint

# Production Next.js build
npm run build
```

---

## 4. Technical Documentation Suite

Comprehensive architecture, database, API, and deployment documentation is available in [`docs/`](./docs):

- [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md) &mdash; Detailed audit of existing system architecture.
- [`docs/TARGET_ARCHITECTURE.md`](./docs/TARGET_ARCHITECTURE.md) &mdash; Architectural blueprint and migration roadmap.
- [`docs/API.md`](./docs/API.md) &mdash; Complete REST API endpoint reference and payload specifications.
- [`docs/DATABASE.md`](./docs/DATABASE.md) &mdash; Prisma models, relationships, and seeding guide.
- [`docs/AUTHENTICATION.md`](./docs/AUTHENTICATION.md) &mdash; Dual-track auth flows, RBAC, tokens, cookies, and rate-limiting.
- [`docs/MOBILE.md`](./docs/MOBILE.md) &mdash; Mobile architecture, Expo Router v4 setup, API client, and EAS builds.
- [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) &mdash; Environment variables reference and default settings.
- [`docs/SECURITY_AUDIT.md`](./docs/SECURITY_AUDIT.md) &mdash; Comprehensive defensive security audit and headers.
- [`docs/SCRATCH_AUDIT.md`](./docs/SCRATCH_AUDIT.md) &mdash; Migration audit and permanent directory standards.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) &mdash; Production deployment runbook (VPS, Docker, Netlify, PostgreSQL).
- [`docs/REFACTOR_REPORT.md`](./docs/REFACTOR_REPORT.md) &mdash; Complete before/after refactor summary and verification log.

---

## 5. Technology Stack

- **Web Framework:** Next.js 16.2.9 (App Router, Edge Proxy `src/proxy.ts`, REST API)
- **UI Engine:** React 19.2.4 + Tailwind CSS 4
- **Mobile Client:** Expo SDK 52 + Expo Router v4 + React Native 0.76.7
- **Database:** Prisma Client v6 (SQLite in Dev, PostgreSQL in Production)
- **Security:** `jose` (JWT), `bcryptjs`, Edge route protection, HTTP security headers
- **Documents:** `pdf-lib` + `pdfkit` (GST Invoices, Transport Challans)
- **Notifications:** Twilio (WhatsApp & SMS alerts)

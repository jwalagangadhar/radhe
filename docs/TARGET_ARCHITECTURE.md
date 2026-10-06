# Target Architecture Document — Radhe Traders Platform

**Document Version:** 1.0.0  
**Status:** Architecture Blueprint & Migration Plan  

---

## 1. Principles & Safety Directives

1. **Zero Functional Regression:** The existing working application must continue running without interruption.
2. **Next.js 16 Native Conventions:** Preserve App Router conventions (`src/app/`), including `src/proxy.ts` (Next.js 16 proxy convention).
3. **Pragmatic Organization over Artificial Monorepos:** Retain the proven `src/` application core and `mobile/` Expo project without introducing fragile workspace linkers or breaking path aliases (`@/*`).
4. **Clean Root Directory:** Relocate loose root test scripts to `tests/` and operational utilities to `scripts/`.
5. **Scratch Preservation:** Transition verified test suites and tools from `scratch/` into permanent `tests/` and `scripts/`, archiving one-off scripts.
6. **Strict Separation of Concerns:**
   - **Frontend:** Pages, UI components, client context.
   - **Backend:** API route handlers, business logic engines, authentication.
   - **Database:** Prisma schema, seeds, migrations, client singleton.
   - **Shared:** Constants, domain types, formatters.
   - **Mobile:** Dedicated Expo Router mobile app consuming backend REST endpoints.

---

## 2. Target Directory Structure

```
radhe/
│
├── .vscode/                     # Editor configuration
├── public/                      # Static assets & public uploads
│   ├── uploads/
│   │   ├── invoices/            # Generated Tax Invoices (PDF)
│   │   ├── challans/            # Generated Delivery Challans (PDF)
│   │   └── product-*.jpg        # Uploaded catalog images
│   ├── logo.png
│   └── favicon-legacy.ico
│
├── prisma/                      # Database persistence tier
│   ├── schema.prisma            # Declarative database schema
│   ├── seed.ts                  # Database seeding script
│   └── dev.db                   # Local SQLite database
│
├── mobile/                      # Expo / React Native mobile app
│   ├── app/                     # Expo Router screen tree
│   │   ├── (admin)/             # Admin mobile screens
│   │   ├── (worker)/            # Worker mobile screens
│   │   ├── _layout.tsx          # Root native stack
│   │   └── login.tsx            # Mobile login
│   ├── src/                     # Mobile application source
│   │   ├── api/                 # Mobile REST API clients
│   │   ├── components/          # Reusable React Native UI
│   │   ├── context/             # AuthContext & state
│   │   ├── hooks/               # Custom React Native hooks
│   │   ├── types/               # Mobile TypeScript interfaces
│   │   └── utils/               # Storage & formatters
│   ├── assets/                  # Mobile icons & splash screens
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # EAS build configuration
│   └── package.json             # Mobile dependencies
│
├── src/                         # Full-stack Next.js web application
│   ├── proxy.ts                 # Next.js 16 Edge proxy / role-based route guard
│   │
│   ├── app/                     # Next.js App Router (Routes & APIs)
│   │   ├── (customer)/          # Public customer storefront route group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── about/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── order-success/
│   │   │   └── products/
│   │   │
│   │   ├── portal/              # Staff & management portal
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Portal entry point & router
│   │   │   ├── login/           # Staff login screen
│   │   │   ├── access-denied/   # Role-based 403 screen
│   │   │   ├── admin/           # Admin ERP & Operations Portal
│   │   │   │   ├── arrivals/
│   │   │   │   ├── cash-counter/
│   │   │   │   ├── inventory/
│   │   │   │   ├── orders/
│   │   │   │   ├── quick-order/
│   │   │   │   ├── settings/
│   │   │   │   ├── stock-requests/
│   │   │   │   └── take-order/
│   │   │   │
│   │   │   └── worker/          # Worker Operations Portal
│   │   │       ├── history/
│   │   │       ├── queue/
│   │   │       ├── quick-order/
│   │   │       └── stock/
│   │   │
│   │   ├── track/               # Public customer order tracking
│   │   ├── layout.tsx           # Global root layout & metadata
│   │   ├── globals.css          # Tailwind CSS global styles
│   │   │
│   │   └── api/                 # REST API Handlers
│   │       ├── auth/            # /api/auth/login, logout, me
│   │       ├── checkout/        # /api/checkout
│   │       ├── dashboard/       # /api/dashboard & low-stock-alerts
│   │       ├── erp/             # /api/erp/* (cash-bills, invoices, ledger, etc.)
│   │       ├── invoices/        # /api/invoices
│   │       ├── messages/        # /api/messages
│   │       ├── notifications/   # /api/notifications
│   │       ├── orders/          # /api/orders/*
│   │       ├── products/        # /api/products/*
│   │       ├── qr/              # /api/qr/generate
│   │       ├── stock-additions/
│   │       ├── stock-adjustments/
│   │       ├── stock-arrivals/
│   │       ├── stock-requests/
│   │       ├── upload/          # /api/upload
│   │       ├── webhooks/        # /api/webhooks/idfc
│   │       └── workers/         # /api/workers
│   │
│   ├── components/              # Frontend UI Components
│   │   ├── CustomerNav.tsx
│   │   ├── PortalNav.tsx
│   │   ├── CartProvider.tsx
│   │   ├── ProductCard.tsx
│   │   ├── OrderCard.tsx
│   │   ├── BarcodeScannerModal.tsx
│   │   ├── BarcodeLabelModal.tsx
│   │   ├── StockAlertsPanel.tsx
│   │   ├── LowStockAlertsPanel.tsx
│   │   ├── WorkerStockAdditionPanel.tsx
│   │   ├── AdminStockApprovalPanel.tsx
│   │   └── erp/                 # ERP Subsystem Components
│   │       ├── CashCounterBilling.tsx
│   │       ├── ComplianceExporter.tsx
│   │       ├── GstBillingModule.tsx
│   │       ├── LedgerViewer.tsx
│   │       ├── OrderTakingEngine.tsx
│   │       ├── PrintControllerModal.tsx
│   │       └── TransportDispatchModule.tsx
│   │
│   └── lib/                     # Business Logic, Backend Services, Shared Utilities
│       ├── api.ts               # API helpers, CSRF validation, requireAuth()
│       ├── auth.ts              # JWT creation, verification, session cookies
│       ├── background.ts        # Background worker for PDF & notifications
│       ├── db.ts                # Prisma singleton & auto-seed checks
│       ├── erp-engine.ts        # GST calculation, invoice sequencing, ledger
│       ├── idfc.ts              # IDFC First Bank payment gateway client
│       ├── notifications.ts     # Twilio SMS & WhatsApp notification engine
│       ├── pdf.ts               # PDF generation for invoices & challans
│       ├── rate-limit.ts        # Memory-based rate limiter
│       └── types.ts             # Domain models, variants, formatting helpers
│
├── scripts/                     # Operational, database, and utility scripts
│   ├── check-db.ts              # Database inspection utility
│   └── regenerate-pdf.ts        # Invoice PDF regeneration utility
│
├── tests/                       # Integration, E2E, and regression test suites
│   ├── test-auth-flows.ts       # RBAC & authentication integration tests
│   ├── test-mobile-api.ts       # Mobile REST API & security suite
│   ├── test-admin-billing.ts    # Admin cash counter & wholesale test
│   └── test-pdf.ts              # PDF generation validation test
│
├── archive/                     # Archived one-off / scratch scripts
│
├── docs/                        # Complete technical documentation suite
│   ├── CURRENT_ARCHITECTURE.md  # Detailed audit of existing system
│   ├── TARGET_ARCHITECTURE.md   # Architectural blueprint & plan
│   ├── API.md                   # Complete REST API reference
│   ├── DATABASE.md              # Prisma models, relations, seed guide
│   ├── AUTHENTICATION.md        # Auth flows, RBAC, tokens, cookies
│   ├── MOBILE.md                # Mobile architecture, setup, builds
│   ├── ENVIRONMENT.md           # Environment variables reference
│   ├── SECURITY_AUDIT.md        # Comprehensive defensive security audit
│   ├── SCRATCH_AUDIT.md         # Scratch directory review & actions
│   ├── DEPLOYMENT.md            # Production deployment runbook
│   └── REFACTOR_REPORT.md       # Full before/after refactor report
│
├── .env.example                 # Clean sanitized environment template
├── .gitignore                   # Git ignore patterns
├── eslint.config.mjs            # ESLint 9 configuration
├── netlify.toml                 # Netlify deployment configuration
├── next.config.ts               # Next.js configuration & security headers
├── package.json                 # Project dependencies & scripts
├── postcss.config.mjs           # PostCSS configuration
├── README.md                    # Comprehensive master README
└── tsconfig.json                # TypeScript configuration
```

---

## 3. Migration & Refactoring Execution Steps

### Phase 1: Documentation Foundation (Non-destructive)
- Write `docs/CURRENT_ARCHITECTURE.md` (Completed)
- Write `docs/TARGET_ARCHITECTURE.md` (Current step)
- Write `docs/API.md`, `docs/DATABASE.md`, `docs/AUTHENTICATION.md`, `docs/MOBILE.md`, `docs/ENVIRONMENT.md`, `docs/SECURITY_AUDIT.md`, `docs/SCRATCH_AUDIT.md`, `docs/DEPLOYMENT.md`

### Phase 2: Root & Scratch Cleanup (Zero-Risk Relocations)
- Create `scripts/` and `tests/` directories.
- Move root scripts `test-pdf.ts` to `tests/test-pdf.ts` and `regenerate-pdf.ts` to `scripts/regenerate-pdf.ts`, updating imports.
- Migrate `scratch/test-auth-flows.ts` and `scratch/test-mobile-api.ts` to `tests/`.
- Migrate `scratch/test-admin-cash-counter.ts` to `tests/test-admin-billing.ts`.
- Migrate `scratch/check-db.js` to `scripts/check-db.ts`.
- Remove unreferenced duplicate `src/lib/pdf-lib.ts` after verifying zero imports.
- Update `package.json` scripts to provide `npm test` and test execution commands.

### Phase 3: ESLint & Build Validation
- Update `eslint.config.mjs` to ignore `mobile/**` (which has its own independent React Native configuration) and test folders.
- Resolve any outstanding high-severity lint issues without altering runtime behavior.
- Validate `tsc --noEmit` and mobile `typecheck`.

### Phase 4: Full System Verification & Master Documentation
- Verify customer storefront, admin portal, worker portal, REST APIs, and mobile app connectivity.
- Update master `README.md`.
- Generate final `docs/REFACTOR_REPORT.md`.

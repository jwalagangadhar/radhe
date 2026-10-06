# xyz — Grocery Portal

A full-stack web application for **xyz** (abc): public customer website, WhatsApp/SMS order alerts, and a role-based admin/worker portal — all backed by one centralized database.

## Features

### Customer Website (`/`)
- Homepage with family-business branding
- Searchable product catalog by category
- Shopping cart and checkout (name, phone, address, optional GST)
- Real-time prices and stock from the database

### Notifications
- Instant WhatsApp or SMS alert to the shop owner when a web order is placed
- Powered by Twilio (logs to console when not configured)

### Staff Portal (`/portal/login`)
| Role | Access |
|------|--------|
| **Admin** | Dashboard, inventory/pricing, order approvals |
| **Worker** | Packing queue, walk-in quick orders (save as draft) |

## Quick Start

```bash
npm install
npm run db:setup    # create SQLite DB + seed products & users
npm run dev         # http://localhost:3000
```


## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite (`file:./dev.db`) or PostgreSQL connection string |
| `JWT_SECRET` | Secret for session tokens |
| `ADMIN_PHONE` | Owner phone for alerts (E.164, e.g. `+919642423395`) |
| `TWILIO_*` | Twilio credentials for WhatsApp/SMS |

## API Endpoints (Phase 2 ready)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | Public | List products |
| POST | `/api/products` | Admin | Add product |
| PATCH | `/api/products/:id` | Admin | Update price/stock |
| POST | `/api/orders` | Public/Staff | Place web or walk-in order |
| GET | `/api/orders` | Staff | List orders |
| PATCH | `/api/orders/:id` | Staff | Update order status |
| GET | `/api/dashboard` | Admin | Sales stats |
| POST | `/api/auth/login` | Public | Staff login |

## Production

For production, switch `DATABASE_URL` to PostgreSQL:

```
DATABASE_URL="postgresql://user:pass@host:5432/radhe"
```

Then run `npm run db:setup` against the production database.

## Tech Stack

- **Next.js 16** (App Router, REST API)
- **Prisma** + SQLite/PostgreSQL
- **Tailwind CSS 4**
- **Twilio** (WhatsApp/SMS)
- **JWT** session auth

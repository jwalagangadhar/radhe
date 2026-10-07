# Database Architecture & Schema Reference — Radhe Traders Platform

**ORM:** Prisma Client v6  
**Engines:** SQLite (`dev.db`) for Development; PostgreSQL for Hosted Production  
**Location:** `prisma/schema.prisma`

---

## 1. Core Data Models

### User (Staff & Roles)
Represents enterprise staff members with Role-Based Access Control (RBAC).
- `id` (String, cuid, Primary Key)
- `username` (String, unique)
- `email` (String, unique, optional)
- `phone` (String, optional)
- `password` (String, bcrypt hashed)
- `name` (String)
- `role` (`Role`: `ADMIN` | `WORKER`)
- `active` (Boolean, default: true)
- `createdAt`, `updatedAt`

### Customer (Wholesale & Retail Directory)
- `id` (String, cuid, Primary Key)
- `name` (String)
- `phone` (String, unique)
- `email` (String, optional)
- `address`, `city`, `state`, `stateCode` (String)
- `gstNumber` (String, optional)
- `creditLimit`, `currentBalance` (Float)
- Relations: `orders`, `invoices`, `ledgerAccount`

### Product (Inventory & Catalog)
- `id` (String, cuid, Primary Key)
- `name` (String)
- `category` (String)
- `price` (Float, selling rate)
- `costPrice` (Float, purchase rate, admin-only visibility)
- `stock` (Float, total on hand)
- `unpackedStock` (Float, loose inventory)
- `unit` (String, e.g. "kg", "bag")
- `bagWeight` (Float, optional, weight per gunny bag)
- `hsnCode` (String, GST HSN code)
- `gstRate` (Float, tax percentage e.g. 5%)
- `barcode` (String, optional)
- `availability` (Enum: `ONLINE`, `STORE`, `BOTH`)

### Order & OrderItem
- `Order`:
  - `id`, `orderNumber` (Int, autoincrement sequence)
  - `type` (`WEB` | `WALK_IN`)
  - `status` (`PENDING`, `APPROVED`, `PACKING`, `IN_TRANSIT`, `DELIVERED`, `INVOICED`, `COMPLETED`, `CANCELLED`)
  - `subtotal`, `taxTotal`, `total` (Float)
  - `customerName`, `customerPhone`, `shippingAddress`
  - Relations: `items`, `invoice`, `deliveryChallan`
- `OrderItem`:
  - `id`, `orderId`, `productId`
  - `quantity`, `price`, `taxRate`, `subtotal`

### Invoicing & Delivery
- `Invoice`:
  - Formal GST Tax Invoice (`INV-YYYY-XXXX`)
  - `invoiceNumber`, `invoiceDate`, `placeOfSupply`
  - `totalTaxable`, `totalCgst`, `totalSgst`, `totalIgst`, `grandTotal`
  - `pdfPath` (Server path to generated PDF)
- `DeliveryChallan`:
  - Physical goods transport document (`DC-YYYY-XXXX`)
  - Transport details: `vehicleNumber`, `driverName`, `driverPhone`, `destination`

### Accounting & General Ledger (ERP)
- `LedgerAccount`: Account code, name, group (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`), balance.
- `JournalEntry`: Double-entry transaction header.
- `JournalPosting`: Itemized debit and credit line items.
- `PaymentRecord`: Payment receipts and allocations (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`).

---

## 2. Seeding & Auto-Initialization

### Automated Bootstrap (`src/lib/db.ts:ensureDefaultData()`)
On fresh deployments or server startup, `ensureDefaultData()` verifies if staff users and catalog items exist. If missing, it creates:
- Admin (`admin` / `admin123`)
- Worker (`worker` / `worker123`)
- Core daily staple products (Sugar, Basmati Rice, Atta, Toor Dal)

### Comprehensive Seeding (`npm run db:seed`)
Executes `prisma/seed.ts` to populate:
1. Default Company Settings (`Radhe Wholesale & Retail Traders`, GSTIN, Bank details).
2. RBAC Staff accounts.
3. Customer directory with wholesale ledgers.
4. Comprehensive product catalog with HSN codes and packaging bag weights.
5. Sample historical orders, invoices, and double-entry postings.

---

## 3. Database Maintenance Commands

| Command | Action |
|:---|:---|
| `npm run db:setup` | Pushes Prisma schema to DB and seeds initial data |
| `npm run db:push` | Synchronizes `schema.prisma` changes with local/remote DB |
| `npm run db:seed` | Re-seeds sample datasets |
| `npm run db:check` | Inspects current order counts and statuses |
| `npx prisma studio` | Launches interactive web GUI for database inspection |

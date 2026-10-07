# Production Deployment Runbook — Radhe Traders Platform

**Target Runtime:** Node.js 20+ / Docker / VPS / Vercel / Netlify  
**Database:** PostgreSQL (AWS RDS, Supabase, Neon, or Managed VPS PostgreSQL)

---

## 1. Pre-Deployment Checklist

1. **Environment Variables:** Verify all production keys in `.env` (PostgreSQL `DATABASE_URL`, strong `JWT_SECRET`, Twilio credentials).
2. **Build Validation:** Execute local build verification:
   ```bash
   npm run build
   ```
3. **Database Migration:** Push the Prisma schema to the production database:
   ```bash
   npx prisma db push
   ```
4. **Seed Bootstrap:** Populate company settings and initial admin credentials:
   ```bash
   npm run db:seed
   ```

---

## 2. Docker / Containerized VPS Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 3. Serverless / Netlify Deployment (`netlify.toml`)

The repository includes a verified `netlify.toml`:
```toml
[build]
  command = "prisma generate && next build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## 4. Operational Backups & Maintenance

- **Database Dumps (Daily):**
  ```bash
  pg_dump -U radhe -d radhe_prod -F c -b -v -f /backups/radhe_$(date +%Y%m%d).dump
  ```
- **Invoice & Challan Storage:**
  Back up the `/public/uploads/` directory to persistent object storage (AWS S3 or Cloudflare R2).

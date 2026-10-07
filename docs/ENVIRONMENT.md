# Environment Configuration Reference — Radhe Traders Platform

All configuration variables are defined in `.env` (copied from `.env.example`).

---

## 1. Core Server & Database Configuration

| Variable | Description | Default / Example | Required |
|:---|:---|:---|:---:|
| `DATABASE_URL` | SQLite file path or PostgreSQL connection URI | `file:./dev.db` | **Yes** |
| `JWT_SECRET` | Secret key used for signing HS256 session tokens | Long random alphanumeric string | **Yes** |
| `NODE_ENV` | Runtime environment mode | `development` / `production` | No |

---

## 2. Default RBAC Accounts & Auto-Seed Settings

When the database is initialized on a clean host, these defaults seed the initial owner accounts:

| Variable | Description | Default |
|:---|:---|:---|
| `ADMIN_EMAIL` | Default administrator email address | `admin@example.com` |
| `ADMIN_PASSWORD` | Default administrator password | `admin123` |
| `WORKER_EMAIL` | Default worker staff email address | `worker@example.com` |
| `WORKER_PASSWORD` | Default worker staff password | `worker123` |
| `ADMIN_PHONE` | Business owner phone for order alerts | `+919876543210` |

---

## 3. SMS & WhatsApp Notifications (Optional in Local Dev)

In development mode without API credentials, notifications gracefully log to the terminal console and display a demo banner.

### Twilio Integration (Global / International SMS & WhatsApp)
| Variable | Description |
|:---|:---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (`AC...`) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Sender phone number in E.164 format |
| `TWILIO_WHATSAPP_NUMBER` | Sender WhatsApp number (e.g. `whatsapp:+14155238886`) |

### Fast2SMS Integration (Indian Domestic SMS / OTP)
| Variable | Description |
|:---|:---|
| `FAST2SMS_API_KEY` | Fast2SMS Gateway Authorization key for instant Indian SMS |

---

## 4. Payment Gateway (IDFC First Bank)

| Variable | Description |
|:---|:---|
| `IDFC_MERCHANT_ID` | Merchant account ID |
| `IDFC_SECRET_KEY` | HMAC-SHA256 signature generation key |
| `IDFC_TERMINAL_ID` | Point-of-sale terminal identifier |

---

## 5. Mobile Expo Client (`mobile/.env`)

| Variable | Description |
|:---|:---|
| `EXPO_PUBLIC_API_URL` | Base API URL pointing to the Next.js server (e.g. `http://192.168.29.246:3000`) |

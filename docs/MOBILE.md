# Mobile Architecture & Development Guide — Radhe Traders Platform

**Framework:** Expo SDK 52 + React Native 0.76.7  
**Router:** Expo Router v4 (`mobile/app/`)  
**Package:** `com.radhetraders.app`

---

## 1. Mobile Directory Structure

```
mobile/
├── app/                         # Expo Router screens
│   ├── (admin)/                 # Admin mobile experience
│   │   ├── (tabs)/              # Bottom tab navigation
│   │   │   ├── index.tsx        # Dashboard & live metrics
│   │   │   ├── inventory.tsx    # Stock management
│   │   │   └── orders.tsx       # Live order feed
│   │   └── order-details.tsx    # Order review & approval
│   │
│   ├── (worker)/                # Worker mobile experience
│   │   ├── (tabs)/
│   │   │   ├── index.tsx        # Packing queue
│   │   │   └── orders.tsx       # Order fulfillment history
│   │   └── order-details.tsx    # Item-by-item packing checklist
│   │
│   ├── _layout.tsx              # Root native stack & session check
│   └── login.tsx                # Mobile staff login screen
│
├── src/
│   ├── api/                     # REST API client (`client.ts`)
│   ├── components/              # Native UI components
│   ├── context/                 # Mobile AuthContext
│   ├── hooks/                   # Network & query hooks
│   └── types/                   # TypeScript interfaces
│
├── assets/                      # App icon, splash screen, adaptive icon
├── app.json                     # Expo manifest & EAS configuration
└── package.json                 # Mobile dependencies
```

---

## 2. API Communication & Security (`mobile/src/api/client.ts`)

- **Base URL:** Configured via `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000` or local LAN IP `http://192.168.x.x:3000`).
- **Encrypted Token Storage:** Uses `expo-secure-store` to safely persist JWT tokens on the mobile device hardware keychain.
- **Dual Credential Transmission:** Attaches both `Authorization: Bearer <token>` and `Cookie: radhe_session=<token>` on all requests.
- **Automatic 401 Interception:** Clears secure storage and routes to the login screen when an invalid or expired session is detected.
- **Request Timeouts:** Default 15-second AbortController timeout on all network calls.

---

## 3. Mobile Execution & Development Commands

From the project root:

| Command | Action |
|:---|:---|
| `npm run android` | Starts Expo dev client and launches on Android emulator/device |
| `npm --prefix mobile run start` | Starts interactive Expo bundler CLI (Metro) |
| `npm --prefix mobile run web` | Launches Expo web preview on `http://localhost:8081` |
| `npm --prefix mobile run typecheck` | Validates mobile TypeScript compilation |

---

## 4. Production EAS Builds

```bash
# Build standalone Android APK / AAB
cd mobile
eas build --platform android --profile production

# Build standalone iOS IPA
eas build --platform ios --profile production
```

# PropPilot Mobile

React Native (Expo Router) app for PropPilot — the UK property due diligence platform.

## Features

| Screen | Role |
|--------|------|
| Login / Signup | All |
| HomeBuyer Dashboard | Buyer |
| Property Report (flood, EPC, crime, broadband, council tax) | Buyer |
| Stamp Duty Calculator | Buyer + Owner |
| Lease Extension Calculator | Buyer |
| Buying Checklist (interactive, with progress) | Buyer |
| HomeOwner Dashboard | Owner |
| Maintenance Calendar (add, complete, delete tasks) | Owner |
| Document Vault (add, filter, remove documents) | Owner |
| EPC Upgrade Planner (band picker + improvement cards) | Owner |

## Quick start

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) app on your iPhone or Android phone

### Install & run

```bash
cd mobile
npm install
npm start
```

Scan the QR code with:
- **iOS**: Camera app → tap the notification
- **Android**: Expo Go app → scan QR

### Run on simulator

```bash
npm run ios      # requires Xcode on macOS
npm run android  # requires Android Studio
```

## Configure API URL

The property report screen calls your live Vercel deployment. Update the base URL in `lib/api.ts`:

```typescript
const BASE_URL = 'https://your-vercel-url.vercel.app'
```

For local development against the Next.js dev server:

```typescript
const BASE_URL = 'http://localhost:3000'
```

> On a physical device, `localhost` won't resolve — use your machine's local IP address instead (e.g. `http://192.168.1.x:3000`).

## Project structure

```
mobile/
├── app/
│   ├── _layout.tsx          # Root navigator
│   ├── index.tsx            # Auth gate → redirect
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (buyer)/             # Tab navigator for HomeBuyers
│   │   ├── index.tsx        # Dashboard
│   │   ├── property-report.tsx
│   │   ├── stamp-duty.tsx
│   │   ├── lease-extension.tsx
│   │   └── checklist.tsx
│   └── (owner)/             # Tab navigator for HomeOwners
│       ├── index.tsx        # Dashboard
│       ├── maintenance.tsx
│       ├── documents.tsx
│       ├── epc-upgrade.tsx
│       └── stamp-duty.tsx
├── components/
│   ├── Btn.tsx
│   ├── Card.tsx
│   ├── Header.tsx
│   └── PlanBadge.tsx
├── lib/
│   ├── auth.ts              # AsyncStorage-based auth (mirrors web localStorage auth)
│   ├── api.ts               # Fetch client → Vercel API routes
│   └── colours.ts           # PropPilot design tokens
├── app.json                 # Expo config
├── package.json
└── tsconfig.json
```

## Auth

Auth state is stored in `AsyncStorage` (the React Native equivalent of `localStorage`). The same email/password accounts you create in the mobile app are scoped to the device — they don't sync with the web app's `localStorage` accounts. Both use the same API routes for property data.

## Build for production

```bash
npm install -g eas-cli
eas build --platform ios      # iOS .ipa
eas build --platform android  # Android .apk / .aab
```

You'll need an [Expo account](https://expo.dev) and Apple/Google developer accounts for store submission.

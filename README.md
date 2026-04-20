# PropHealth

AI home intelligence platform for UK homeowners.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `EPC_API_EMAIL` | Your email used when registering at epc.opendatacommunities.org |
| `EPC_API_KEY` | From epc.opendatacommunities.org — register free |
| `OS_PLACES_API_KEY` | From osdatahub.os.uk — register free, 1,000 calls/day free tier |
| `STRIPE_SECRET_KEY` | From dashboard.stripe.com |
| `REDIS_URL` | `redis://localhost:6379` for local dev |

### 3. Start Redis (required for caching)

```bash
# macOS
brew services start redis

# Windows (WSL or Docker)
docker run -d -p 6379:6379 redis:alpine

# Linux
sudo systemctl start redis
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
  app/
    page.tsx                        # Landing page
    layout.tsx                      # Root layout + metadata
    api/
      property/
        lookup/route.ts             # POST /api/property/lookup (unified)
      epc/
        [postcode]/route.ts         # GET /api/epc/:postcode
      valuation/
        [postcode]/route.ts         # GET /api/valuation/:postcode
    lib/
      epc.ts                        # EPC Register API client
      landRegistry.ts               # Land Registry + HPI client
      maintenance.ts                # Maintenance prediction engine
      cache.ts                      # Redis caching layer
  styles/
    globals.css                     # Design tokens + global styles
```

---

## API endpoints

### `POST /api/property/lookup`

Unified lookup — EPC + valuation + maintenance in one call.

```json
{
  "postcode": "SW1A 2AA",
  "address": "10 Downing Street",
  "houseNumber": "10",
  "street": "Downing Street"
}
```

### `GET /api/epc/:postcode?address=...`

EPC certificate lookup. Returns certificate, upgrade recommendations, and grant eligibility.

```
GET /api/epc/SW1A2AA?address=10+Downing+Street
```

### `GET /api/valuation/:postcode?houseNumber=...&street=...`

Land Registry valuation. Returns estimated value, last sale, and recent comparables.

```
GET /api/valuation/SW1A2AA?houseNumber=10&street=Downing+Street
```

---

## Data sources

| Source | What it provides | Cost |
|---|---|---|
| MHCLG EPC Register | EPC band, upgrade recommendations | Free |
| HM Land Registry | Price paid history, HPI data | Free |
| OS Data Hub | Address lookup and validation | Free tier (1K/day) |
| Ofgem (planned) | Energy tariff data | Free |

---

## Deployment (Vercel)

```bash
npm run build
vercel --prod
```

Set all environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

Make sure your Redis instance is accessible from your deployment region. Use [Upstash](https://upstash.com) for a serverless-compatible Redis option (free tier available).

---

## Roadmap

- [ ] OS Places API integration for address autocomplete
- [ ] Stripe subscription billing (Free / Pro / Portfolio tiers)
- [ ] Email capture + Resend integration for waitlist
- [ ] Leasehold manager (Companies House + Land Registry title data)
- [ ] Remortgage radar (fix expiry alerts + Bank of England rate feed)
- [ ] ML maintenance model (once 1,000+ properties with outcomes)
- [ ] Contractor referral marketplace

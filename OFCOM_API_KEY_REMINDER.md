# Ofcom API Key — Action Required

> **Reminder posted: 25 May 2026**

Your Ofcom Broadband Coverage API request should be approved today. Follow these steps to activate live broadband data in PropHealth:

## Steps

1. Go to [https://api.ofcom.org.uk](https://api.ofcom.org.uk) and log in
2. Click your profile (top right) → **Profile**
3. Under **Subscriptions**, find **"Broadband Coverage"** and click **Show** next to the Primary key
4. Copy the key
5. Open `D:\PropHealth\.env.local`
6. Replace `paste_your_primary_key_here` on this line:
   ```
   OFCOM_SUBSCRIPTION_KEY=paste_your_primary_key_here
   ```
7. Save the file and restart your dev server:
   ```
   npm run dev
   ```

## What this unlocks

Once the key is in place, the **broadband speed check** in the homebuyer report will return **live Ofcom data** instead of the manual-check fallback link.

---
*You can delete this file once the key is configured.*

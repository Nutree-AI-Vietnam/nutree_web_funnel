# Nutree Web Funnel

Web onboarding funnel (start.nutree.ai): quiz -> TDEE results -> email capture ->
RevenueCat Web Billing checkout -> app download handoff via Airbridge claim token.

Design spec: `docs/superpowers/specs/2026-07-07-web-to-app-funnel-design.md`

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · zustand · @revenuecat/purchases-js ·
Vitest · Playwright. Vietnamese-only copy lives in `src/lib/copy/vi.ts`.

## Development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm test                     # unit tests (vitest)
npm run test:e2e             # Playwright (mocked backend)
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Nutree backend base URL (no trailing slash) |
| `NEXT_PUBLIC_RC_WEB_BILLING_KEY` | RevenueCat Web Billing public API key (`rcb_...`) |
| `NEXT_PUBLIC_GA4_ID` | GA4 measurement id (optional; script omitted if unset) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel id (optional) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Pixel id (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_APP_NAME` | Airbridge app name (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN` | Airbridge web SDK token (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK` | Airbridge tracking link for the success page |
| `NEXT_PUBLIC_APPSTORE_URL` / `NEXT_PUBLIC_PLAYSTORE_URL` | Raw store URLs |

## Deploy (Vercel)

Import the repo in Vercel, set the env vars above for Production/Preview, and point
`start.nutree.ai` at the project. No special build settings (defaults work).

## External Dependencies

- **Backend** (separate team): `POST /v1/tdee/preview` (exists),
  `POST /v1/web-funnel/leads` + `POST /v1/web-funnel/claim` + RC webhook (per design spec).
- **Mobile** (`nutree_ai`): deferred deep link handler + claim service, separate plan in that repo.
- **RevenueCat**: Web Billing app configured, offering with web packages.
- **Airbridge**: tracking link created in dashboard (goes in
  `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK`).

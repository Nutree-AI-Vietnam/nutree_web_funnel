# Nutree Web Funnel

Web onboarding funnel (start.nutree.ai): quiz -> TDEE results -> email capture ->
RevenueCat Web checkout -> direct Nutree magic-link/custom-token handoff.

Design spec: `docs/superpowers/specs/2026-07-07-web-to-app-funnel-design.md`

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · zustand ·
Vitest. Localized copy lives in `src/lib/copy/vi.ts` and
`src/lib/copy/en.ts`.

## Localization and Pricing

- Vietnam (`VN`) uses Vietnamese copy and the VND offering configured in RevenueCat.
- Every non-Vietnam market uses English copy and the USD offering configured in RevenueCat.
- Keep text and currency aligned on every screen: do not show Vietnamese copy
  with USD, and do not show English copy with VND.
- Market detection should stay automatic from browser/backend country context;
  do not add manual country switching to the funnel screens unless explicitly
  requested.

## Development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm test                     # unit tests (vitest)
npm run build                # production build check
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Nutree backend base URL (no trailing slash) |
| `WEB_FUNNEL_BFF_SHARED_SECRET` | Server-only shared credential required by MealTrack for lead creation |
| `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` | RevenueCat Web public API key for the web checkout config |
| `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID` | Offering identifier containing the three web packages |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK` / `12_WEEK` / `52_WEEK` | Exact package identifiers from that offering |
| `NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID` / `NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME` | Matching Nutree app bundle/package IDs for the phone handoff flow |
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

### Vercel import templates

Copy `config/vercel-preview.env.example` to `.env.preview.local` and
`config/vercel-production.env.example` to `.env.production.local`. Fill the local
files, which stay ignored by Git, then import non-empty values with:

```bash
./scripts/import-vercel-env.sh preview .env.preview.local
./scripts/import-vercel-env.sh production .env.production.local
```

Preview must use RevenueCat's sandbox web key/config; Production uses the live web key/config. Redeploy after an import because
`NEXT_PUBLIC_*` values are embedded during the build.

## External Dependencies

- **RevenueCat Web**: connect Paddle Billing, import products, map them to the Nutree Premium entitlement, and configure the web offering/package IDs above.
- **Lead handoff BFF**: the web app creates a possession-bound checkout draft through `/api/web-funnel/session` and `/api/web-funnel/leads`, then polls `/status` and can request `/resend` or `/session/reset` with the same-origin lead-access cookie.
- **Firebase Auth**: configure the mobile app’s custom-token claim path. The web funnel never completes Firebase auth in-browser; `/open-nutree` is a token-free install/reopen fallback.
- **Backend**: retains its RevenueCat webhook/cache for enforcing Premium APIs and lead-status projection.
  For live checkout, use an approved production domain. Sandbox supports localhost.
- **Airbridge**: tracking link created in dashboard (goes in
  `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK`).

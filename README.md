# Nutree Web Funnel

Web onboarding funnel (quiz.nutreeai.com production, quiz.preview.nutreeai.com preview): quiz -> TDEE results -> email capture ->
RevenueCat Web checkout -> RevenueCat Redemption Link -> authenticated mobile claim.

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
| `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED` | Public default-off anonymous-customer redemption handoff; enable only for staging/SIT and redeploy after changing |
| `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID` | Offering identifier containing the three web packages |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK` / `12_WEEK` / `52_WEEK` / `1_WEEK` | Exact package identifiers from that offering |
| `NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED` | Build-time toggle: `true` shows the 1-week package instead of the 52-week package |
| `NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID` / `NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME` | Matching Nutree app bundle/package IDs for the phone handoff flow |
| `NEXT_PUBLIC_GA4_ID` | GA4 measurement id (optional; script omitted if unset) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel id (optional) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Pixel id (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_APP_NAME` | Airbridge app name (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN` | Airbridge web SDK token (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK` | Airbridge tracking link for the success page |
| `NEXT_PUBLIC_APPSTORE_URL` / `NEXT_PUBLIC_PLAYSTORE_URL` | Raw store URLs |
| `NUTREE_ANDROID_SHA256_CERT_FINGERPRINTS` | Server-only comma/newline-separated release SHA-256 fingerprints for Android App Links |

## Deploy (Vercel)

The quiz is a Next.js deployment on Vercel. Use the linked `nutree_web_funnel`
project, set the env vars above in the matching Preview/Production
environments, and attach these domains to that project:

| Vercel environment | Domain | Firebase project used by the matching mobile flavor |
|---|---|---|
| Preview | `quiz.preview.nutreeai.com` | `nutree-ai-staging` |
| Production | `quiz.nutreeai.com` | `nutree-ai` |

Deploy with the guarded helpers below. They run the web tests and production
build before submitting a deployment, and require an explicit confirmation
flag for production:

```bash
./scripts/deploy-vercel.sh preview
CONFIRM_PRODUCTION_DEPLOY=1 ./scripts/deploy-vercel.sh production
```

No special Vercel build settings are required. The custom domains must be
owned by the Vercel team and resolve to this project before the domain URLs are
deployment proof. `NEXT_PUBLIC_*` values are embedded at build time, so
changing them requires a new deployment.

The app serves host-specific `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json` responses. Set the matching release fingerprint
in each Vercel environment; leaving it empty intentionally returns no Android
association until the signing certificate is configured.

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
- **Firebase Auth**: the web funnel never completes Firebase auth in-browser; `/open-nutree` and `/redeem` are token-free install/reopen fallbacks.
- **Redemption handoff**: when `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED=true`, the web app generates an anonymous RevenueCat web customer, completes checkout with that customer, and sends only the anonymous `app_user_id` plus a SHA-256 digest of the redemption URL to the same-origin BFF for lead correlation. The browser keeps the raw redemption URL only in memory, then navigates to `/postcheckout`. RevenueCat sends the Redemption Link to the checkout email; the mobile app keeps the normal passwordless email-link sign-in flow visible and silently resumes redemption after Firebase authentication. The browser never grants access.
- **Backend**: retains its RevenueCat webhook/cache for enforcing Premium APIs and lead-status projection.
  For live checkout, use an approved production domain. Sandbox supports localhost.
- **Airbridge**: tracking link created in dashboard (goes in
  `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK`).

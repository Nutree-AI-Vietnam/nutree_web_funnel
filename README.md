# Nutree Web Funnel

Web onboarding funnel (start.nutree.ai): quiz -> TDEE results -> email capture ->
Paddle subscription checkout -> app download handoff.

Design spec: `docs/superpowers/specs/2026-07-07-web-to-app-funnel-design.md`

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · zustand ·
Vitest. Localized copy lives in `src/lib/copy/vi.ts` and
`src/lib/copy/en.ts`.

## Localization and Pricing

- Vietnam (`VN`) uses Vietnamese copy and Paddle's VND price override.
- Every non-Vietnam market uses English copy and Paddle's USD price.
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
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | Required Paddle target: `sandbox` or `live` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle browser token matching the target environment |
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

Preview must use Paddle sandbox; Production uses Paddle live. Redeploy after an import because
`NEXT_PUBLIC_*` values are embedded during the build.

## External Dependencies

- **Backend** (separate team): `POST /v1/tdee/preview`, `POST /v1/web-funnel/leads`,
  lead fulfillment from the verified Paddle webhook at `POST /v1/webhooks/paddle`,
  and a later Firebase-authenticated mobile claim endpoint. See
  `docs/email-first-funnel-backend-handoff.md`.
- **Paddle**: configure the default payment link under Checkout > Checkout settings.
  For live checkout, use an approved production domain. Sandbox supports localhost.
- **Airbridge**: tracking link created in dashboard (goes in
  `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK`).

# Vercel Deployment Plan

Goal: deploy `nutree_web_funnel` to Vercel as the public web-to-app funnel, with
preview deployments for QA and a production domain such as `start.nutree.ai`.

Current repo status:

- Framework: Next.js `16.2.10`
- Package manager: npm
- Build command: `npm run build`
- Local start command: `npm run dev`
- Required runtime env vars are documented in `README.md` and `.env.example`.

Official docs checked:

- Vercel states Next.js deployments are zero-configuration on Vercel.
- Vercel Git integration creates Preview deployments for non-production branches
  and Production deployments from the production branch.
- Vercel env vars are configured per environment. Changes only apply to new
  deployments.
- Subdomains use CNAME records when the domain is managed outside Vercel.

## Task 1: Pre-deployment verification

- [x] Run local verification from repo root:

```bash
cd /Users/truongle/nutree_web_funnel
npm test
npm run build
```

- [ ] Confirm there are no required secrets committed to the repo.
- [x] Confirm `.env.example` has all required keys and no real secret values.
- [x] Decide production domain:
  - Recommended: `start.nutree.ai`
  - Preview/staging can use Vercel preview URLs first.

## Task 2: Create/import Vercel project

Manual dashboard work:

- [x] Open Vercel dashboard.
- [x] Import the Git repository for `nutree_web_funnel`.
- [x] Set project name:
  - Recommended: `nutree-web-funnel`
- [x] Confirm framework preset:
  - Next.js
- [x] Confirm build settings:
  - Build command: `npm run build`
  - Install command: `npm install`
  - Output directory: leave default
  - Root directory: repo root, `/`
- [ ] Set production branch:
  - Recommended: `main`

No `vercel.json` is required unless we later need custom headers, redirects,
regions, or build overrides.

## Task 3: Configure environment variables

Add these in Vercel Project Settings -> Environment Variables.

Current status on 2026-07-11: `vercel env ls` reports no environment variables
for `aaa-s-nutreeai/nutree_web_funnel`. `.env.local` was not present locally.

Use separate values for Production and Preview if backend/payment systems differ.

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | production backend URL | staging/backend test URL |
| `NEXT_PUBLIC_RC_WEB_BILLING_KEY` | RevenueCat live/public web key | RevenueCat sandbox/test public web key |
| `NEXT_PUBLIC_GA4_ID` | production GA4 id | optional test GA4 id |
| `NEXT_PUBLIC_META_PIXEL_ID` | production pixel id | blank or test pixel |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | production pixel id | blank or test pixel |
| `NEXT_PUBLIC_AIRBRIDGE_APP_NAME` | production Airbridge app name | same or staging value |
| `NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN` | production web token | staging/test token |
| `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK` | production tracking link | staging/test tracking link |
| `NEXT_PUBLIC_APPSTORE_URL` | public App Store URL | same |
| `NEXT_PUBLIC_PLAYSTORE_URL` | public Play Store URL | same |

Important:

- These are `NEXT_PUBLIC_*` variables, so they are exposed to the browser by
  design. Do not place backend secrets here.
- Vercel only applies env var changes to new deployments. Redeploy after
  changing values.

## Task 4: First preview deployment

- [ ] Push the current branch or open a PR to trigger a Preview deployment.
- [ ] Verify Vercel build succeeds.
- [ ] Open the generated `*.vercel.app` Preview URL.
- [ ] Smoke test:
  - Landing page loads.
  - Quiz flow reaches TDEE results.
  - Email submit calls the configured backend.
  - Paywall loads RevenueCat packages.
  - Checkout opens in sandbox/test mode.
  - Success page generates app download/QR link.

Expected blocker if backend is not ready:

- Email submission will fail until `POST /v1/web-funnel/leads` exists for the
  configured API base URL.

## Task 5: Production deployment

- [x] Merge to `main` or trigger a production deployment from Vercel.
- [x] Verify production build succeeds.
- [x] Check production deployment URL before assigning the custom domain.
- [ ] Confirm production env vars are set before routing real traffic.

Current deployment:

- Project: `aaa-s-nutreeai/nutree_web_funnel`
- Project ID: `prj_YDef2X7CYY9mz4kqAb5J0apwWTyd`
- Deployment ID: `dpl_43LTnfM2FfK5ketwBCEqkcefCFxY`
- Production URL: `https://nutreewebfunnel.vercel.app`
- Deployment URL:
  `https://nutreewebfunnel-ocpr5d9yr-aaa-s-nutreeai.vercel.app`

## Task 6: Custom domain setup

Manual dashboard/DNS work:

- [x] In Vercel Project Settings -> Domains, add:
  - `start.nutree.ai`
- [ ] If `nutree.ai` DNS is not managed by Vercel, add the DNS record at the
  current DNS provider:

```text
Type: CNAME
Name: start
Value: cname.vercel-dns.com
```

- [ ] Wait for DNS verification and SSL certificate provisioning.
- [ ] Open `https://start.nutree.ai` and verify it resolves to the latest
  production deployment.

Current status on 2026-07-11:

- `vercel domains add start.nutree.ai` reported success adding the domain to the
  linked project, then returned a 403 fetching domain details.
- `vercel alias set nutreewebfunnel.vercel.app start.nutree.ai` is blocked:
  current Vercel account/team does not have access to `start.nutree.ai`.
- Manual follow-up: verify `nutree.ai` ownership/team assignment in Vercel or
  switch the CLI to the Vercel team that owns the domain.

## Task 7: Launch validation

- [ ] Test full funnel on desktop Chrome.
- [ ] Test full funnel on mobile Safari.
- [ ] Test full funnel on mobile Chrome.
- [ ] Confirm RevenueCat webhook marks the backend lead paid.
- [ ] Confirm confirmation/download email is sent by backend.
- [ ] Confirm Airbridge attribution/deferred deep link carries `claim_token`.
- [ ] Confirm mobile app claim flow can consume the token.
- [ ] Confirm analytics events appear in GA4/Meta/TikTok as expected.

## Manual Inputs Needed

Before production launch, collect:

- Vercel account/team access.
- Git provider access for repo import.
- DNS provider access for `nutree.ai`.
- Production backend base URL.
- Preview/staging backend base URL, if available.
- RevenueCat Web Billing public keys for preview and production.
- Airbridge tracking link and web token.
- App Store and Play Store URLs.
- Analytics pixel IDs.

## Recommended Order

1. Import project into Vercel.
2. Configure Preview env vars first.
3. Get one Preview deployment green.
4. Connect `start.nutree.ai`.
5. Configure Production env vars.
6. Deploy production.
7. Run launch validation.

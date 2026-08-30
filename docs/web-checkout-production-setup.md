# Web checkout setup and release guide

## Overview

Canonical paid web → mobile handoff (ship-first contract):

```text
Survey email (lead) → anonymous RevenueCat Web SDK checkout
→ thin correlation (app_user_id + redeem-link digest)
→ redemption CTA / RC email → mobile Home shell
→ Firebase email (match lead) → eligibility → redeem once
→ MealTrack finalize → entitlement refresh → home_active
```

The browser never grants access from a checkout callback. MealTrack owns
purchase/access truth. Legacy magic-email / custom-token claim is not the
active producer path.

Redemption checkout stays default-off in production until staging SIT passes
(`NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED`).

## Contract (cross-repo)

1. **Lead email** is ownership authority.
2. **Correlation** = lead + anonymous RC `app_user_id` + redeem-link **digest**
   (never raw URL in storage/logs/analytics).
3. **Eligibility** = verified Firebase email/UID may consume that row before redeem.
4. **Finalize** = atomic MealTrack grant; idempotent; select by hash+UID (not
   “latest matching UID”).
5. **Home pending** = inert shell + email prompt; **home_active** only after refresh.

Deferred: opaque preflight receipts, lease/CAS. Browser-loss without digest →
RC purchase email / support; never a second charge.

## Flavor matrix (no secrets)

| Flavor | Bundle / package | Firebase project | Quiz / continue host | RC redemption scheme | Vercel domain |
|---|---|---|---|---|---|
| staging | `com.nutreeai.mobile.staging` | `nutree-ai-staging` | `quiz.preview.nutreeai.com` | `rc-6eb1beb650` | Preview |
| prod | `com.nutreeai.mobile` | `nutree-ai` | `quiz.nutreeai.com` | **ops-provisioned** (build fails on placeholder) | Production |
| dev | `com.nutreeai.mobile.dev` | `nutree-ai-dev-4c49d` | preview host (non-prod) | placeholder until needed | local |

Android App Links fingerprints live only in Vercel
`NUTREE_ANDROID_SHA256_CERT_FINGERPRINTS` (never commit). Empty → fail-closed
`assetlinks.json` (`[]`).

Associated Universal / App Link paths (browser-owned otherwise):
`/auth/email-link*`, `/open-nutree*`, `/redeem*`. **`/postcheckout*` is not
associated** — post-pay stays in the browser.

Runtime: mobile rejects wrong-flavor RC schemes and Firebase hosts/projects
before parse or secure persistence.

## Prerequisites

- Mobile build registers the RevenueCat Redemption Links custom URL scheme and
  ships Home-shell redemption (not activate-plan-only).
- App-absent users get install + reopen-the-same-email guidance (no custom
  deferred-link service).
- RevenueCat: web offering, packages, `standard` entitlement, Redemption Links,
  webhook, environment-specific identifiers.
- MealTrack migrations run on deploy (`python migrations/run.py`).
- `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED=true` only on staging Preview until
  SIT sign-off; production stays `false` until then.

## Sandbox proof matrix (installed / app-absent)

| Journey | Expected |
|---|---|
| Staging RC redeem link, app installed | Opens staging build → Home shell + email prompt |
| Firebase email action link, app installed | Opens staging build; wrong-project / wrong-host rejected |
| App absent → install from store/TestFlight | User reopens **same** checkout / RC redemption email (no deferred-link service) |
| Wrong-flavor scheme / host | Rejected before persist; no Home pending state |

Do not invent deferred deep linking. If capability is lost after install,
instruct reopen of the same email / RC ~60‑minute resend.

## Redemption handoff guardrails

- New anonymous RevenueCat customer per checkout; do not reuse lead ID as
  `appUserId`.
- After checkout, BFF posts `app_user_id` + digest to
  `/api/web-funnel/leads/[leadId]/revenuecat-correlation`.
- Raw redemption URL stays memory-only for CTA/QR; persist digest only.
- Web never signs in to Firebase.
- Mobile redeem requires the same email as the lead.
- Independent kill switch for new checkout; paid correlation/preflight/finalize
  stay available during rollback.

RevenueCat owns web packages and offering experiments. MealTrack verifies the
environment and active `standard` entitlement; it does not use a product
allowlist, RevenueCat project ID, or RevenueCat app ID. The browser checkout
callback never grants access by itself.

## Release blockers and checklist

- [ ] Staging mobile build opens RC redeem links into Home shell (email prompt;
  onboarding suppressed) and completes redeem → finalize → refresh.
- [ ] App-absent journey: install, reopen same email / RC resend; no second charge.
- [ ] Staging/production backend + Vercel env configured with no secrets in docs.
- [ ] Sandbox SIT: anonymous checkout, BFF correlation, digest-only handoff,
  same-email mobile redeem, rollback kill switch preserves paid recovery.

## Staging release

### 1. Deploy MealTrack to its staging service

Deploy the backend branch containing the web-funnel migration and routes to the
Render staging service (`delivery`). Keep the configured pre-deploy command:

```text
python migrations/run.py
```

Confirm the health endpoint responds after the migration completes.

### 2. Configure MealTrack staging

Set the following in the staging backend service. Generate one random value for
`WEB_FUNNEL_BFF_SHARED_SECRET` and set the identical value in Vercel Preview;
never put it in `NEXT_PUBLIC_*`, source control, logs, or this document.

```dotenv
WEB_FUNNEL_BFF_ORIGIN=https://<vercel-preview-origin>
WEB_FUNNEL_BFF_SHARED_SECRET=<generate-a-new-staging-secret>
WEB_FUNNEL_LEGACY_CLAIM_ENABLED=false
# WEB_FUNNEL_CLAIM_LINK_BASE_URL=  # legacy magic-claim only; leave unset while LEGACY=false
REVENUECAT_SECRET_API_KEY=<server-only-revenuecat-secret>
REVENUECAT_WEBHOOK_SECRET=<staging-revenuecat-webhook-secret>
WEB_FUNNEL_REVENUECAT_ENVIRONMENT=SANDBOX
ALLOWED_ORIGINS=https://<vercel-preview-origin>
```

The web owns its offerings, packages, prices, and A/B experiments. MealTrack
checks the authoritative `standard` entitlement for the lead, not a configured
list of web product IDs. It does require one static environment value so a
webhook from a different RevenueCat environment cannot issue a claim.

| Setting | Required value |
|---|---|
| `WEB_FUNNEL_BFF_ORIGIN` | Exact Vercel Preview origin |
| `WEB_FUNNEL_BFF_SHARED_SECRET` | New server-only shared secret |
| `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` | `false` (default). Keep off; do not enqueue/send magic claim email |
| `WEB_FUNNEL_CLAIM_LINK_BASE_URL` | Legacy-only; required only if temporarily re-enabling magic claim |
| `REVENUECAT_SECRET_API_KEY` | Server-only sandbox/appropriate RevenueCat secret key |
| `REVENUECAT_WEBHOOK_SECRET` | Exact secret for the staging webhook endpoint |
| `WEB_FUNNEL_REVENUECAT_ENVIRONMENT` | `SANDBOX` for staging; `PRODUCTION` in production |
| `ALLOWED_ORIGINS` | Exact Vercel Preview origin, if browser-to-backend calls exist outside the BFF |

The web funnel is always enabled after backend deployment. Do **not** add rollout
flags, a backend product allowlist, a RevenueCat project ID, or a RevenueCat app
ID. The backend does not read them.

### 3. Configure Vercel Preview

In Vercel project `nutree_web_funnel`, add these Preview values:

Copy this into the Vercel Preview environment editor, replacing each placeholder.
`WEB_FUNNEL_BFF_SHARED_SECRET` must exactly match MealTrack staging and must not
be added to any `NEXT_PUBLIC_*` variable.

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://<staging-backend-host>
WEB_FUNNEL_BFF_SHARED_SECRET=<same-staging-bff-secret>
NEXT_PUBLIC_REVENUECAT_WEB_API_KEY=<sandbox-web-public-key>
NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID=<sandbox-offering-id>
NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK=<sandbox-4-week-package-id>
NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK=<sandbox-12-week-package-id>
NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK=<sandbox-52-week-package-id>
NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK=<sandbox-1-week-package-id>
NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED=false
NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED=true
NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID=<staging-ios-bundle-id>
NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME=<staging-android-package-name>
NEXT_PUBLIC_APPSTORE_URL=<staging-ios-install-url>
NEXT_PUBLIC_PLAYSTORE_URL=<staging-android-install-url>
```

| Setting | Required value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Staging MealTrack base URL, without trailing slash |
| `WEB_FUNNEL_BFF_SHARED_SECRET` | Same value as MealTrack staging |
| `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` | Sandbox web public key |
| `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID` | Sandbox offering ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK` | Sandbox package ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK` | Sandbox package ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK` | Sandbox package ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK` | Optional sandbox package ID used when the 1-week toggle is enabled |
| `NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED` | `true` to show 1-week instead of 52-week; `false` to keep 52-week |
| `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED` | `true` for staging/SIT Preview, `false` everywhere else until production sign-off |
| `NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID` / `NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME` | Exact staging mobile bundle/package for phone handoff |
| `NEXT_PUBLIC_APPSTORE_URL` / `NEXT_PUBLIC_PLAYSTORE_URL` | Staging-compatible install destinations |

Redeploy Preview after changing any `NEXT_PUBLIC_*` value.

### 4. Verify the complete staging journey

Use a sandbox buyer and a compatible installed **staging** mobile build with
Home-shell redemption (`rc-6eb1beb650` scheme registered).

1. Complete the web quiz with a valid DOB and submit email (lead ownership).
2. Confirm one possession-bound lead is created; a second browser with only the
   email cannot recover it.
3. Confirm RevenueCat Web checkout stays **anonymous** (not lead UUID as
   `appUserId`); optional `customerEmail` may match the survey email.
4. Complete payment; browser correlates `app_user_id` + redeem-link **digest**,
   then lands on `/postcheckout` (browser-owned). Raw redeem URL is never
   persisted.
5. Confirm checkout/RC email has the redemption link; logs/analytics never store
   the raw URL or magic tokens.
6. Open the redemption link on the staging app → Home shell + passwordless email
   prompt (onboarding suppressed). Sign in with the **same** lead email →
   eligibility → redeem once → finalize → entitlement refresh → `home_active`.
7. Exercise duplicate open, wrong-email rejection, kill-switch rollback
   (paid recovery still works), and app-not-installed → install → reopen same
   email / RC redemption resend. Do **not** exercise MealTrack magic-claim resend
   (`WEB_FUNNEL_LEGACY_CLAIM_ENABLED` stays false).

Do not promote while any step is unverified or while the staging scheme /
fingerprints / associations are unproven on device.

## Production promotion

Repeat the staging configuration with production-specific values. Use a new
production BFF shared secret; do not reuse the staging secret.

1. Deploy the same reviewed MealTrack revision and let pre-deploy migrations pass.
2. Configure production backend values using the live RevenueCat secret API key,
   live webhook secret, production claim host, and `https://quiz.nutreeai.com` as
   BFF origin. Production must use
   `WEB_FUNNEL_REVENUECAT_ENVIRONMENT=PRODUCTION` and a new server-only
   `WEB_FUNNEL_BFF_SHARED_SECRET`; do not add product IDs, project ID, or app ID.
3. Configure the same production Vercel values and redeploy `quiz.nutreeai.com`.
   Keep `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED=false` until the sandbox SIT
   checklist is complete and production enablement is approved.
4. Recheck the claim host's Apple App Site Association and Android App Links
   configuration against the released mobile bundle/package.
5. Run one controlled live buyer journey before directing traffic to the funnel.
   Verify webhook delivery, backend payment verification, email delivery, mobile
   claim completion, active `standard` access, and refund handling.

## Rollback

- To stop new entries, roll back the web deployment or temporarily remove public
  traffic at the edge; do not delete existing leads, claims, provider events, or
  outbox records. There is no backend web-funnel feature flag.
- Restore the prior Vercel deployment if a web regression is isolated there.
- Restore the previous backend image only after confirming migration compatibility;
  use a forward repair rather than a destructive schema downgrade.
- Keep webhook reconciliation and claim/outbox workers available for already-paid
  customers until every pending record is resolved.

## Troubleshooting

| Symptom | Check |
|---|---|
| Lead create returns 404 | Backend revision, BFF origin, and matching server-only shared secret. |
| Lead create returns 401/403 | HttpOnly cookie presence and same-origin BFF request checks. |
| Checkout remains pending | RevenueCat webhook delivery, exact `SANDBOX`/`PRODUCTION` match, and backend-fetched `standard` entitlement. |
| No email | Backend email setting, claim-link base URL, outbox worker, and sender configuration. |
| Link opens browser instead of app | Exact quiz host associations (`/auth/email-link*`, `/open-nutree*`, `/redeem*` only), fingerprints, released mobile build, and install + reopen-same-email fallback. |
| Mobile redeem conflicts | Firebase email match to lead, flavor scheme allowlist, and backend preflight/finalize logs; do not merge accounts manually. |
| Prod build blocked on RC scheme | Provision live Redemption Links scheme in RC dashboard; set `REVENUECAT_REDEMPTION_URL_SCHEME` (iOS xcconfig / Android CI) and matching Dart define. |

## References

- `README.md` for web environment names and Vercel import workflow.
- `docs/firebase-email-link-identity-handoff.md` for the canonical security and
  claim contract.
- `mealtrack_backend/docs/guides/render-cd.md` for Render deployment behavior.

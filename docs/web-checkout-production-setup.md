# Web checkout setup and release guide

## Overview

This guide prepares the paid web onboarding flow:

```text
Web quiz -> possession-bound lead -> RevenueCat Web checkout
-> verified standard entitlement -> Nutree magic email
-> mobile custom-token claim -> restored profile, plan, and access
```

The browser never grants access from a checkout callback. MealTrack verifies the
provider state and the mobile app completes the authenticated claim.

## Prerequisites

- Mobile origin/delivery still lacks the claim coordinator from #587/#588. Do not
  treat the flow as released until that mobile work is deployed and verified.
- The exact staging or production claim host opens the installed app and routes
  app-absent users to `/open-nutree` with a token-free request path/query.
- RevenueCat has the matching web offering, packages, `standard` entitlement,
  webhook destination, API credentials, and environment-specific app identifiers.
- MealTrack deploys migrations with its Render pre-deploy command.

RevenueCat owns web packages and offering experiments. MealTrack verifies the
environment and the active `standard` entitlement; it does not use a web-product
allowlist, RevenueCat project ID, or RevenueCat app ID. The browser checkout
callback never grants access by itself.

## Release blockers and checklist

### Blockers

- [ ] Mobile origin/delivery includes the claim coordinator from #587/#588 and
  the deployed app has been verified with a real claim flow.
- [ ] The claim host opens the installed app on both platforms and falls back to
  `/open-nutree` when the app is not installed.
- [ ] Staging and production backend values are set exactly as documented below,
  with no secret values committed to source control or pasted into this file.

### Operator checklist

- [ ] MealTrack backend deploys cleanly with the current migration command.
- [ ] Vercel Preview uses the same shared secret as staging backend.
- [ ] Vercel Production uses the same shared secret as production backend.
- [ ] RevenueCat environment values are exact: `SANDBOX` for staging and
  `PRODUCTION` for production.
- [ ] Release notes clearly state that backend verification, provider state, and
  mobile claim completion are separate steps.

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

Copy this into the MealTrack staging environment editor, then replace every
`<...>` placeholder with the staging value. Keep the shared secret server-only.

```dotenv
WEB_FUNNEL_BFF_ORIGIN=https://<vercel-preview-origin>
WEB_FUNNEL_BFF_SHARED_SECRET=<generate-a-new-staging-secret>
WEB_FUNNEL_REVENUECAT_ENVIRONMENT=SANDBOX
WEB_FUNNEL_CLAIM_LINK_BASE_URL=https://<staging-claim-host>/open-nutree
REVENUECAT_SECRET_API_KEY=<sandbox-revenuecat-secret-api-key>
REVENUECAT_WEBHOOK_SECRET=<staging-revenuecat-webhook-secret>
ALLOWED_ORIGINS=https://<vercel-preview-origin>
```

`ALLOWED_ORIGINS` is only needed for any browser-to-MealTrack calls outside the
server-side BFF. Do not include it if your existing staging CORS policy is
intentionally broader and already covers the Preview origin.

| Setting | Required value |
|---|---|
| `WEB_FUNNEL_BFF_ORIGIN` | Exact Vercel Preview origin |
| `WEB_FUNNEL_BFF_SHARED_SECRET` | New server-only shared secret |
| `WEB_FUNNEL_REVENUECAT_ENVIRONMENT` | `SANDBOX` |
| `WEB_FUNNEL_CLAIM_LINK_BASE_URL` | `https://<staging-claim-host>/open-nutree` |
| `REVENUECAT_SECRET_API_KEY` | Server-only sandbox/appropriate RevenueCat secret key |
| `REVENUECAT_WEBHOOK_SECRET` | Exact secret for the staging webhook endpoint |
| `ALLOWED_ORIGINS` | Exact Vercel Preview origin, if browser-to-backend calls exist outside the BFF |

The web funnel is always enabled after backend deployment. Do **not** add rollout
flags or a backend product allowlist, RevenueCat project ID, or RevenueCat app ID.
The backend does not read them, and they would make future offering experiments
unnecessarily costly.

### 3. Configure Vercel Preview

In Vercel project `nutree_web_funnel`, add these Preview values:

| Setting | Required value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Staging MealTrack base URL, without trailing slash |
| `WEB_FUNNEL_BFF_SHARED_SECRET` | Same value as MealTrack staging |
| `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` | Sandbox web public key |
| `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID` | Sandbox offering ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK` | Sandbox package ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK` | Sandbox package ID |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK` | Sandbox package ID |
| `NEXT_PUBLIC_FIREBASE_IOS_BUNDLE_ID` / `NEXT_PUBLIC_FIREBASE_ANDROID_PACKAGE_NAME` | Exact staging mobile bundle/package for the phone handoff |
| `NEXT_PUBLIC_APPSTORE_URL` / `NEXT_PUBLIC_PLAYSTORE_URL` | Staging-compatible install destinations |

Redeploy Preview after changing any `NEXT_PUBLIC_*` value.

### 4. Verify the complete staging journey

Use a sandbox buyer and a compatible installed staging mobile build containing
the claim coordinator and failed-claim subscription recovery.

1. Complete the web quiz with a valid DOB and submit email.
2. Confirm one possession-bound lead is created; a second browser with only the
   email cannot recover it.
3. Confirm RevenueCat Web checkout identifies the customer as the lead UUID.
4. Complete payment and verify the browser remains in pending state until the
   RevenueCat webhook plus backend customer fetch verify `standard`.
5. Confirm the email contains the direct fragment link and neither browser logs
   nor Vercel request metadata contain the magic token.
6. Open the link on mobile, complete custom-token claim, and verify restored
   profile/DOB/plan plus fresh `standard` access. Confirm that the Firebase user
   resolves to the paid lead's RevenueCat customer ID.
7. Exercise resend, duplicate submit, claim replay, refund/revocation, and
   app-not-installed recovery.

Do not promote while any step is unverified or while the mobile claim
coordinator remains absent from the deployed build.

## Production promotion

Repeat the staging configuration with production-specific values. Use a new
production BFF shared secret; do not reuse the staging secret.

1. Deploy the same reviewed MealTrack revision and let pre-deploy migrations pass.
2. Configure production backend values using the live RevenueCat secret API key,
   live webhook secret, production claim host, and `https://start.nutree.ai` as
   BFF origin. Production must use
   `WEB_FUNNEL_REVENUECAT_ENVIRONMENT=PRODUCTION` and a new server-only
   `WEB_FUNNEL_BFF_SHARED_SECRET`; do not add product IDs, project ID, or app ID.
3. Configure the same production Vercel values and redeploy `start.nutree.ai`.
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
- Keep the mobile release blocked until the claim coordinator from #587/#588 is
  present in the deployed origin/delivery build.

## Troubleshooting

| Symptom | Check |
|---|---|
| Lead create returns 404 | Backend revision, BFF origin, and matching server-only shared secret. |
| Lead create returns 401/403 | HttpOnly cookie presence and same-origin BFF request checks. |
| Checkout remains pending | RevenueCat webhook delivery, exact `SANDBOX`/`PRODUCTION` match, and backend-fetched `standard` entitlement. |
| No email | Backend email setting, claim-link base URL, outbox worker, and sender configuration. |
| Link opens browser instead of app | Exact claim host, iOS/Android association files, released mobile build, and app-not-installed fallback. |
| Mobile claim conflicts | Firebase identity state and backend claim/recovery logs; do not merge accounts manually. |

## References

- `README.md` for web environment names and Vercel import workflow.
- `docs/firebase-email-link-identity-handoff.md` for the canonical security and
  claim contract.
- `mealtrack_backend/docs/guides/render-cd.md` for Render deployment behavior.

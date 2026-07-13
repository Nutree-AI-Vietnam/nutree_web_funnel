# RevenueCat Web Billing Setup

This checklist is for the Nutree web-to-app funnel paywall. The web app already
fetches the current RevenueCat offering and starts checkout with
`@revenuecat/purchases-js`.

## Recommended Catalog

Use these stable identifiers unless there is already an existing Nutree naming
scheme in RevenueCat.

| Type | Identifier | Notes |
|---|---|---|
| Entitlement | `premium` | Same entitlement the mobile app checks to unlock paid features. |
| Offering | `web_funnel_default` | Mark this as the Default Offering while testing this funnel. |
| Monthly package | `$rc_monthly` | Package identifier in the offering. |
| Monthly product | `nutree_premium_monthly_web` | RevenueCat Billing web product. |
| Yearly package | `$rc_annual` | Put this first if it should be preselected. |
| Yearly product | `nutree_premium_yearly_web` | RevenueCat Billing web product. |

Suggested first pricing for testing:

| Product | Price |
|---|---|
| `nutree_premium_monthly_web` | Use the closest intended launch monthly price. |
| `nutree_premium_yearly_web` | Use the closest intended launch yearly price. |

## Manual Dashboard Steps

1. Open the RevenueCat dashboard and select the Nutree project used by the
   mobile app.
2. Connect a billing provider for web. For RevenueCat Billing, connect Stripe
   first, then create the RevenueCat Billing web config.
3. Create or confirm the `premium` entitlement.
4. Create the web products:
   - `nutree_premium_monthly_web`
   - `nutree_premium_yearly_web`
5. Attach both products to the `premium` entitlement.
6. Create the `web_funnel_default` offering.
7. Add packages to the offering:
   - `$rc_annual` -> `nutree_premium_yearly_web`
   - `$rc_monthly` -> `nutree_premium_monthly_web`
8. Set `web_funnel_default` as the Default Offering for the test audience.
9. Copy the Web Billing public API key into local and deploy env:
   - `NEXT_PUBLIC_RC_WEB_BILLING_KEY=...`
10. Confirm `/paywall` loads packages after a web lead is created.

## Backend Contract For The Next Step

The browser must not be the payment source of truth. Backend should mark a lead
paid from RevenueCat webhooks.

Expected flow:

1. Web calls `POST /v1/web-funnel/leads` with email and onboarding payload.
2. Backend returns `{ web_user_id, claim_token }`.
3. Web configures RevenueCat with `appUserId = web_user_id`.
4. RevenueCat webhook arrives after purchase or renewal.
5. Backend finds the lead by `web_user_id`, marks it paid, and sends the
   confirmation/download email.
6. Mobile later claims the same lead using `claim_token`.

Minimum webhook fields backend should persist:

| Field | Purpose |
|---|---|
| RevenueCat app user id | Match to `web_user_id`. |
| Entitlement ids | Verify `premium` is active. |
| Product id | Analytics and support. |
| Transaction id | Idempotency key. |
| Event type and time | Audit and lifecycle handling. |

## Local Smoke Test

After the dashboard setup and `.env.local` are ready:

```bash
npm run dev
```

Then complete the funnel to `/paywall`. A working setup should show the monthly
and yearly packages from RevenueCat. Clicking the CTA should open the hosted
checkout UI from RevenueCat Billing.


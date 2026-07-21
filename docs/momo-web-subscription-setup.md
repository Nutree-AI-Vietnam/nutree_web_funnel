# MoMo Web Subscription Setup

This checklist is for the Nutree web funnel hard paywall. The browser never
stores MoMo credentials. It asks MealTrack to create a MoMo subscription checkout
and only unlocks success after MealTrack confirms the MoMo IPN.

## Flow

1. Web calls `POST /v1/web-funnel/leads` with email and onboarding payload.
2. Paywall calls `POST /v1/web-funnel/momo/subscription-checkouts`.
3. MealTrack signs MoMo `requestType=subscription` and returns `pay_url`.
4. Browser redirects to MoMo.
5. MoMo sends `POST /v1/webhooks/momo/subscriptions` to MealTrack.
6. MealTrack verifies the HMAC, creates or links the user, and creates a local
   active subscription.
7. Browser returns to `/momo/return`, polls
   `GET /v1/web-funnel/payment-orders/:order_id/status`, then opens `/success`.

## MealTrack Env

| Variable | Purpose |
|---|---|
| `MOMO_PARTNER_CODE` | Merchant partner code from MoMo. |
| `MOMO_ACCESS_KEY` | MoMo access key used in signature base strings. |
| `MOMO_SECRET_KEY` | HMAC-SHA256 secret. Server only. |
| `MOMO_ENDPOINT` | `https://test-payment.momo.vn` for sandbox. |
| `MOMO_IPN_URL` | Public backend URL ending `/v1/webhooks/momo/subscriptions`. |
| `MOMO_REDIRECT_URL` | Public web URL ending `/momo/return`. |
| `MOMO_MONTHLY_AMOUNT_VND` | Monthly subscription amount. |
| `MOMO_SANDBOX` | `true` for sandbox/test payments. |

## Better Next Steps

- Keep monthly as the first MoMo subscription plan; only add annual after MoMo
  confirms the merchant contract supports an annual subscription cadence.
- Add a renewal cron once the first-purchase path is live: use the saved MoMo
  subscription token and `/v2/gateway/api/subscription/pay`.
- Send a confirmation email from MealTrack after IPN success with the same claim
  token fallback link used by Airbridge.
- Add a small admin report for pending/failed MoMo orders so support can recover
  users who paid but closed the browser before `/momo/return`.

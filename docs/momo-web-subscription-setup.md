# MoMo One-Time Pass Setup

MoMo lets Nutree take one-time payments only, so a MoMo payment buys a fixed
Premium pass (4, 12 or 52 weeks) that never renews. When it ends, the buyer
pays for another pass by hand. A pass bought while one is active starts when
the current one ends. The quiz never stores MoMo credentials: it asks the API
for a pay URL, then polls the API until the order settles. Paddle stays
available, and MoMo is offered (and preselected) only for Vietnam traffic.

## Flow

1. The quiz creates a lead with `POST /v1/web-funnel/leads`.
2. The paywall loads `GET /v1/web-funnel/momo/plans?lead_id=…`. The API quotes
   the intro price for a buyer's first pass and the regular price after that.
3. The buyer picks a pass and the paywall calls
   `POST /v1/web-funnel/momo/checkouts` with `monthly`, `quarterly` or
   `yearly`. The API signs a MoMo `payWithMethod` request (wallet, ATM or card
   on one MoMo page) and returns `pay_url` and `order_id`.
4. The browser opens the MoMo page.
5. MoMo notifies `POST /v1/webhooks/momo/ipn`. The API checks the HMAC
   signature, partner code and amount, marks the order `paid` and the lead
   `payment_verified`, and answers HTTP 204.
6. MoMo sends the browser to `/momo/return?…&orderId=…&resultCode=…`, also
   when the buyer taps "Quay về". That page polls
   `GET /v1/web-funnel/momo/orders/:order_id/status`. While an order is
   pending, the API asks MoMo's query API, so the page settles even when the
   IPN is late or cannot reach the API (local runs). Paid orders continue to
   `/postcheckout`; failed or expired orders show the order id and a way back
   to the paywall.
7. The buyer opens Nutree and signs in with the checkout email. User sync
   grants the RevenueCat promotional `standard` entitlement for the pass
   window, so the app unlocks without a store purchase.

| Price (VND) | First pass | Later passes |
|---|---|---|
| 4 weeks | 99.000 | 198.000 |
| 12 weeks | 249.000 | 498.000 |
| 52 weeks | 599.000 | 1.198.000 |

Prices are code in the API (`src/domain/model/payments/momo_pass.py`); the quiz
shows what the API quotes.

## Where the secrets go

Put these in `backend/.env` and on the API's hosting service. Do not commit
the values and do not put them in the quiz app.

| Variable | What to put |
|---|---|
| `MOMO_ENV` | `sandbox` or `production` |
| `MOMO_PARTNER_CODE` | Partner code from business.momo.vn → Thông tin tích hợp |
| `MOMO_ACCESS_KEY` | Access key from the same page |
| `MOMO_SECRET_KEY` | Secret key from the same page (HMAC key) |
| `MOMO_IPN_URL` | `https://<api-host>/v1/webhooks/momo/ipn` |
| `MOMO_WEB_REDIRECT_URL` | `https://quiz.nutreeai.com/momo/return` |
| `MOMO_APP_REDIRECT_URL` | `nutree://momo-return` (app purchases) |

`REVENUECAT_SECRET_API_KEY` must be set on the API, because a pass unlocks the
app through a RevenueCat promotional entitlement.

The quiz already uses `NEXT_PUBLIC_API_BASE_URL` and
`WEB_FUNNEL_BFF_SHARED_SECRET`. It does not get MoMo keys.

Apply the `add momo payment orders` migration before the first checkout.

## MoMo acceptance tests

MoMo asks for two recorded web runs (partner site → MoMo → back to the partner)
made with our own test partner code:

1. A successful payment: the clip and the `orderId` shown on `/momo/return`.
2. A failed payment where the buyer taps "Quay về" on the MoMo page: the clip
   and the `orderId`.

For the app, only the successful case is needed.

Branding: the paywall and return page use MoMo's own logo
(`public/payments/momo-logo.png`, from MoMo's payment gateway) and always write
the name as "MoMo".

# MoMo One-Time Pass Setup

MoMo lets Nutree take one-time payments only, so a MoMo payment buys a fixed
Premium pass that never renews. The passes follow the card plans (1, 4 and 24
weeks), so the paywall shows one plan list and the buyer picks how to pay in
the checkout sheet that opens from the buy button: Ví MoMo, Thẻ ATM Nội Địa
(both on MoMo's page) or an international card (Paddle). When a pass ends,
the buyer pays for another by hand. A pass bought while one is active starts
when the current one ends. The quiz never stores MoMo credentials: it asks
the API for a pay URL, then polls the API until the order settles. MoMo is
listed (and preselected) only for Vietnam traffic, only in the in-page
checkout sheet, and only while `NEXT_PUBLIC_MOMO_ENABLED=true` on the quiz.
The flag is off by default: the sheet is then card-only and the quiz's
checkout route creates no MoMo orders, so the quiz can ship before the API
sells passes. Turn it on per Vercel environment once that environment's API
has the MoMo routes and settings below; a change needs a redeploy.

## Flow

1. The quiz creates a lead with `POST /v1/web-funnel/leads`.
2. The checkout sheet shows MoMo with the card's numbers for the plan picked
   on the paywall: its plan line, full price, the running offer's discount and
   the first payment, as the card's receipt lines show them. The pass lasts as
   many weeks as the card plan (a 1-month plan is "4 tuần", a 6-month one
   "24 tuần") and is paid once.
3. The buyer picks Ví MoMo or Thẻ ATM Nội Địa, and the sheet calls the quiz's
   `POST /api/web-funnel/momo/checkouts` with the RevenueCat package the card
   would buy (`$rc_six_month`, or `rc_6monthly50` while the welcome offer
   runs) and `wallet` or `atm`. The browser never sends an amount. The quiz
   server reads that package's Paddle price from RevenueCat Billing (the
   offering in `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID`, in VND, kept five
   minutes) and calls the API's `POST /v1/web-funnel/momo/checkouts` with the
   package id, its weeks and its first payment. The API signs a MoMo
   `captureWallet` request for Ví MoMo (QR or app) or a `payWithATM` request
   for a domestic ATM card, and returns `pay_url`, `order_id` and the
   `amount` the order charges. The plan and method stay fixed while the order
   is created. If `amount` differs from the price on screen (Paddle prices
   changed since the page loaded), the paywall does not open MoMo and asks the
   buyer to reload. The unpaid order expires. Checkout errors show the
   paywall's own localized message, not the API's `detail`.
4. The browser opens the MoMo page. If the buyer goes back and the browser
   restores the paywall from its back/forward cache, Pay works again.
5. MoMo notifies `POST /v1/webhooks/momo/ipn`. The API checks the HMAC
   signature, partner code and amount, marks the order `paid` and the lead
   `payment_verified`, and answers HTTP 204.
6. MoMo sends the browser to `/momo/return?…&orderId=…&resultCode=…`, also
   when the buyer taps "Quay về". That page polls
   `GET /v1/web-funnel/momo/orders/:order_id/status`. While an order is
   pending, the API asks MoMo's query API, so the page settles even when the
   IPN is late or cannot reach the API (local runs). Paid orders continue to
   `/postcheckout?method=momo`; failed or expired orders show the order id and
   a way back to the paywall. When the browser has no checkout session (for
   example an in-app browser handed the return to Safari), the page says the
   payment may already be complete, tells the buyer to sign in to Nutree with
   the checkout email, and shows the order id and the support email.
7. The buyer opens Nutree and signs in with the checkout email. User sync
   grants the RevenueCat promotional `standard` entitlement for the pass
   window, so the app unlocks without a store purchase.

| Price (VND) | Full | Welcome (50%) | Exit offer (75%) |
|---|---|---|---|
| 1 week | 129.000 | 59.000 | 29.000 |
| 4 weeks (1 month) | 399.000 | 199.000 | 99.000 |
| 24 weeks (6 months) | 1.099.000 | 599.000 | 399.000 |

MoMo has no prices of its own: these are the Vietnamese Paddle prices in
RevenueCat (October 2026), and a change there changes MoMo within five
minutes. A pass costs the card plan's first payment (the intro price of the
package, else its price). Like the card checkout, the browser chooses the
package; the server only ever prices it.

## Ad reporting

A MoMo order whose charge matches the price on screen sends Meta and TikTok an
`InitiateCheckout` with the plan and VND amount as it opens MoMo, and TikTok an
`AddToCart` for a plan not yet in the cart, like a card checkout. In Vietnam
the sheet opens on MoMo, so the card checkout behind it reports its
`InitiateCheckout` (and marks the tab as a card buyer) only when the buyer
picks the international card; a buyer who stays on MoMo is counted once.

A return page that can read a paid order sends Meta and TikTok a `Purchase`
(pixel plus server copy) with the plan and VND amount. Its event id is fixed
per order, `Purchase.momo.<order_id>`, and the browser keeps a per-order flag
in localStorage, so other tabs and reopened return links in the same browser
do not report the order again, and the platforms drop repeats that carry the
same id within their 48-hour window.

A return that lands in a browser without the checkout session (the in-app
browser to Safari hand-off in step 6) cannot read the order, so it reports
nothing, and the API does not yet report MoMo purchases from the IPN. Those
paid orders are missing from Meta and TikTok. A server-side report sent when
the IPN marks a web order paid must reuse `Purchase.momo.<order_id>` so the
platforms keep one copy when the browser also reports it.

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
`WEB_FUNNEL_BFF_SHARED_SECRET`. It does not get MoMo keys. Its server prices
MoMo with the public RevenueCat web key and offering it already has
(`NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`, `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID`).
The API takes the pass price only on the quiz server's calls, which carry
`WEB_FUNNEL_BFF_SHARED_SECRET`; a browser cannot reach that call or set the
amount.

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

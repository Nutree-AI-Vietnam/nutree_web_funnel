# Email-first funnel backend handoff

## Purpose

The web funnel collects an email before checkout, but that email is a lead contact
and not an authenticated account. The backend owns the lead, Paddle fulfillment,
and the later link to the NutreeAI mobile account.

## 1. Create the lead before checkout

Implement `POST /v1/web-funnel/leads` without authentication.

Request:

```json
{
  "email": "person@example.com",
  "onboarding_payload": { "fitness_goal": "cut" },
  "source": "nutree_web_funnel"
}
```

Response:

```json
{
  "lead_id": "lead_...",
  "masked_email": "pe***@example.com"
}
```

The server must normalize the email, create a high-entropy lead ID, and persist
the complete onboarding payload. Repeated submissions for the same normalized
email must be safe: update the draft lead or return its existing ID according to
the backend's established idempotency convention. Do not create a Firebase user
or grant paid access here.

## 2. Attach Paddle events to the lead

The web checkout supplies this custom data:

```json
{
  "source": "nutree_web_paywall",
  "plan": "...",
  "funnel_lead_id": "lead_..."
}
```

Only the verified Paddle webhook may mark the lead paid. Use `funnel_lead_id` to
upsert the purchase/subscription record and preserve Paddle customer,
subscription, transaction, price, and product IDs. A browser success redirect is
not payment proof.

## 3. Claim on NutreeAI mobile later

The mobile app signs in with Firebase. Its claim endpoint must verify the Firebase
ID token server-side and derive the UID and verified email from that token; never
accept either value from the app body.

For an exact, single paid unmatched lead with the same normalized verified email,
the backend can attach the Firebase UID and expose the paid plan to mobile. If
there are zero or multiple matching leads, or an existing linked identity differs,
require an explicit recovery flow instead of merging records automatically.

The most reliable recovery flow is a short-lived, single-use claim link sent to
the purchase email after verified fulfillment. The mobile deep link carries an
opaque claim token; the backend still verifies the Firebase token before linking.

## State boundaries

| State | Identity | Allowed action |
| --- | --- | --- |
| Draft lead | Email only | Save quiz, prefill Paddle checkout |
| Paid lead | Verified Paddle event | Entitle the eventual matching account |
| Claimed account | Verified Firebase token plus safe match | Unlock mobile and web features |

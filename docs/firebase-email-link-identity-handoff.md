# Mobile-first paid web magic-link identity handoff

> **Historical (Phase 6).** This document describes the retired lead-UUID +
> magic-token / custom-token claim path. It is **not** the active producer
> contract. Canonical flow: anonymous RC checkout → correlation → Home shell →
> Firebase email → eligibility → redeem → finalize. See
> `docs/web-checkout-production-setup.md` and mobile `docs/contracts.md`.

Status: superseded 2026-08-25. Filename retained for cross-repo references.

## Product outcome

The customer completes Nutree onboarding on web, enters email once, pays, opens one
secure email link, and arrives in the app already signed in with the same profile,
plan, and paid access. The app must not ask for email again, replay onboarding, flash
a paywall, or silently merge an account.

## Locked decisions

- Mobile is the canonical onboarding contract. Web captures `birth_year`,
  `birth_month`, and `birth_day` on the existing age step. Age is derived for
  display/TDEE preview; backend validates DOB and derives persisted current age.
- Web creates a lead/onboarding snapshot before checkout. It does not create a
  Firebase/local user, profile, completed onboarding, or entitlement.
- RevenueCat fetched entitlement `standard` is access authority. Browser redirect,
  checkout callback, lead ID, email, and provider metadata never grant access.
- Backend sends a direct Nutree App/Universal Link after verified fulfillment.
- Mobile exchanges the magic token for a Firebase custom token, signs in, then
  completes the claim with a fresh Firebase ID token.
- Database claim effects are atomic. Firebase Admin, email, and RevenueCat calls
  run outside transactions using reservations/outboxes and idempotent recovery.
- Google/Apple, native purchase/restore, RevenueCat providers/gates, backend calorie
  ownership, and current market localization/currency behavior remain unchanged.
- Generic “Continue with email” is a separate follow-up, not part of this paid claim.

## Canonical flow

```text
web DOB onboarding + email
  -> possession-bound lead + immutable onboarding snapshot
  -> RevenueCat Web SDK configured once with lead UUID as identified App User ID
  -> durable RevenueCat webhook + fetched active standard
  -> email outbox sends short-lived Nutree magic link
  -> mobile validates direct link in redacted memory
  -> POST /v1/web-funnel/claims/exchange
  -> Firebase custom token + exchange token
  -> signInWithCustomToken + force-refresh Firebase ID token
  -> POST /v1/web-funnel/claims/complete
  -> atomic user/profile/DOB/plan/onboarding/claim/outbox commit
  -> existing RevenueCat UID association + fresh CustomerInfo
  -> active home OR pending activation recovery
```

## Mobile-aligned onboarding snapshot

`lead_onboarding_snapshot_v1` contains the complete fields required to materialize
the same profile/plan as native onboarding. DOB fields are required and canonical.
The backend may record a derived `age_at_capture` for audit/preview, but neither web
nor mobile sends an authoritative age into claim completion.

Validation rules:

- calendar-valid, non-future DOB within the same supported range as mobile/backend;
- mobile-equivalent gender, measurements, activity, goal, pace, diet, and preferences;
- versioned/immutable snapshot selected at checkout start;
- legacy age-only state asks for DOB on the same step and never invents a birthday;
- all calories/macros/plan outputs are derived and persisted by backend services.

## Endpoints and safe contracts

### Lead

- `POST /v1/web-funnel/leads`
- `GET /v1/web-funnel/leads/{lead_id}/status`
- `POST /v1/web-funnel/leads/{lead_id}/resend`

The same-origin Next BFF owns a host-only HttpOnly Secure SameSite browser access
cookie and forwards it as `X-Lead-Access-Key`. Backend stores only its hash. Email
alone cannot recover/update a draft or disclose its lead ID. Browser-safe responses
contain lead ID, masked email, state enum, and retry timing only.

Before RevenueCat Web SDK configuration, the browser must already possess the lead.
Configure `@revenuecat/purchases-js` once with that lead UUID as `appUserId`; do not
use its anonymous ID generator for this funnel. The SDK package/purchase path remains
unchanged. Backend accepts only the exact known lead App User ID from webhook plus
fetched customer state; email, random anonymous IDs, and unknown aliases never fulfill.

### Direct emailed link

```text
https://<claim-host>/open-nutree#v=2&lead_id=<uuid>&magic_token=<opaque>
```

The request path/query is token-free. The fragment is never sent to the web server.
The installed app validates exact scheme, flavor host, path, version, UUID, fields,
length, and encoding before exposing a redacted in-memory intent. The browser fallback
clears the fragment before rendering/vendors and says install, then reopen the email.

### Exchange

`POST /v1/web-funnel/claims/exchange`

Request concept:

```json
{
  "lead_id": "uuid",
  "magic_token": "opaque",
  "client_retry_secret": "mobile-generated-opaque"
}
```

Response concept (`claim_exchange_v1`):

```json
{
  "schema_version": 1,
  "firebase_custom_token": "opaque",
  "exchange_token": "opaque",
  "expires_in_seconds": 300
}
```

Exchange validates paid/unexpired/unrevoked state, reserves one generation, stores
only the hash of the mobile-generated retry secret, and mints for the server-selected
Firebase UID. Only the same in-memory retry proof may repeat an active reservation;
a copied link without it fails. It creates no local profile, completes no onboarding,
grants no access, and consumes no claim.

The custom token carries only reservation ID/generation as a minimal Firebase custom
claim. This lets authenticated startup recover after Firebase sign-in without storing
magic/exchange credentials. If the process dies before sign-in, the user reopens after
reservation expiry or requests resend; the client stores no retry bearer on disk.

Firebase identity decision table:

| Firebase state | Result |
| --- | --- |
| No user for normalized email | Create backend-owned email UID with verified email |
| Existing email-only UID | Reuse exact UID |
| Same UID already signed in | Reuse fresh bearer; no custom-token account switch |
| Google/Apple-linked, disabled, ambiguous, or inconsistent record | Generic conflict/support; never automatic merge |
| Backend-created provisional UID expires unclaimed | Revoke/delete only after proving no local claim/other provider |

### Authenticated completion

`POST /v1/web-funnel/claims/complete` requires a fresh Firebase bearer.

Request concept:

```json
{ "exchange_token": "opaque" }
```

The transaction verifies reservation/generation/payment/refund plus exact Firebase
UID/email, then creates/syncs the local user, restores DOB/profile/backend plan, marks
onboarding complete, binds the paid lead, consumes the claim, stores an immutable
result, and inserts the RevenueCat association outbox. It calls no external service.

`claim_result_v1` returns `claim_status=claimed|already_claimed`, `plan_snapshot_v1`,
and `access_sync_status=active|pending|refunded` plus safe retry timing.

Normal completion supplies `exchange_token`. After process death, a fresh Firebase
ID token containing the server-minted reservation claim may authorize the same
provisional completion without a device-persisted token; all UID/generation/payment
checks still apply and the same-UID result remains idempotent.

### Recovery

`GET /v1/web-funnel/claims/recovery` is authenticated and returns only the committed
result or `completion_required` for the current UID's valid reservation custom claim.
It repairs response-loss/process-death without device credential persistence.

## State and retry ownership

Browser states include draft, checkout started, payment pending, payment verified,
email queued/sent/delayed, expired, revoked, conflict, refunded, and claimed.

Mobile states include link received, exchanging, authenticating, completing,
restoring, access pending, completed, recoverable failure, and account conflict.

- Browser success starts `payment_pending`; only fetched provider state verifies paid.
- Active reaches restored home.
- Pending preserves any existing access and stays on activation retry; never paywall.
- Same-UID replay returns committed result.
- Different UID/email/provider conflict never silently merges; use switch/support.
- Resend revokes the prior unconsumed magic generation.
- Refund/expiry revokes only when no other active `standard` source remains.

## Transaction and external-side-effect boundary

One database unit of work owns user, profile, DOB/derived age, plan/read models,
onboarding completion, lead binding, claim consumption/result, and RevenueCat outbox.
Any injected failure rolls all of them back and leaves the claim retryable.

Firebase account lookup/custom-token mint, email delivery, RevenueCat transfer, and
CustomerInfo fetch occur outside that transaction. Reservation/outbox state fences
duplicates and independent workers repair crashes before/after each external call.

RevenueCat transfer contract: the backend uses a permission-scoped v2 secret API key
to transfer subscriptions/purchases from source customer ID `lead_id` to a target
customer (created if absent) whose ID equals Firebase UID, filtered to the configured
web app ID. A unique
source-target outbox fence makes retries idempotent. Active is returned only after
fetching the target UID and observing `standard`; target already-active, source already
transferred, two-target race, refund during transfer, and alias propagation are tests.

## Security and privacy invariants

- Magic, browser, exchange, custom, and Firebase ID tokens are bearer credentials:
  hash where stored; short TTL; generation/fencing; no plaintext persistence.
- No raw email, token, full link, provider body/ID, or Firebase exception appears in
  URLs outside the fragment, browser/mobile storage, DOM, route state, logs, traces,
  analytics, crash reports, screenshots, clipboard, support payloads, or CI artifacts.
- Status/resend/login-style responses are anti-enumeration safe and rate limited.
- Never accept client UID/email/provider/DOB/age as identity after exchange; use the
  reservation snapshot and verified Firebase claims.
- Firebase email collision never triggers automatic merge or provider overwrite.
- RevenueCat App User ID `lead_id` and provider metadata are correlation only.

## Release order and rollback

1. Freeze shared fixtures and deploy additive backend dark.
2. Ship native App/Universal Link and custom-token consumer to stores.
3. Verify compatible app availability/minimum version.
4. Ship web DOB/lead/status/fallback pre-activation work.
5. Execute real-device staging matrix and provider replay/recovery drills.
6. Enable a small web email/claim canary, then expand on measured gates.

Rollback disables new lead/email/exchange independently. It preserves issued/claimed
users, completed profiles, native RevenueCat access, and Google/Apple behavior.

## Acceptance matrix

- installed, absent/install/reopen, reinstalled, killed, backgrounded;
- same/cross-device, duplicate, expired, revoked, wrong-flavor link;
- signed out, matching user, different user, UID/account switch race;
- fresh, same-user replay, response loss, refund before/after completion;
- active, pending, refunded, provider delay/outage, worker crash;
- exact DOB/profile/plan parity and backend calorie display;
- all locales/accessibility; no onboarding/paywall/payment-success flash;
- current Google/Apple and native RevenueCat purchase/restore/gates unchanged.

## Unresolved questions

None. Environment hosts, minimum compatible version, and canary percentage are
release-time configuration inputs, not contract choices.

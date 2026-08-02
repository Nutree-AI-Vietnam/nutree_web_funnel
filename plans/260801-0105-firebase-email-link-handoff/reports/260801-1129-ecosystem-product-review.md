---
type: brainstorm
date: 2026-08-01
status: approved-amended
subject: Firebase Email Link ecosystem handoff
---

# Brainstorm: Firebase Email Link Ecosystem Product Review

## Summary

Approved product design for moving a paid web-funnel customer into NutreeAI
without repeating onboarding. Keep the web funnel email-first and Paddle.js-based;
connect Paddle to the existing RevenueCat `standard` entitlement and current
Firebase UID access flow.

Amendment: the later verified Paddle/RevenueCat integration finding supersedes
the original parallel backend-access proposal. See
[Compatible Web Channel Decision](./260801-1315-paddle-revenuecat-compatible-web-channel.md).
The older direct-Paddle shadow/canary and Nutree customer-portal assumptions below
are historical; do not implement them without a new approved legacy decision.

Firebase Email Link remains the MVP identity mechanism. It is passwordless, but
not always one-tap: a new mobile installation does not know the email entered on
web, so the user must enter that email once when completing Firebase sign-in.
The journey must explain this honestly and provide install, resend, expiry, and
account-conflict recovery.

No implementation is authorized by this report. Separate backend and mobile
plans must use this approved design.

## Problem Statement

The web funnel captures nutrition inputs and an email before Paddle checkout.
After verified payment, the customer must:

1. Receive a trustworthy claim email quickly.
2. Open or install NutreeAI.
3. Prove ownership of the checkout email.
4. Attach the paid Paddle subscription to the correct Firebase user.
5. Restore the saved plan without repeating the quiz.
6. Enter the premium experience without a false paywall.

The original handoff direction is feasible, but its first draft underestimates
Firebase email re-entry, app-not-installed behavior, schema differences, and
existing-account conflicts.

## Approved Requirements

### Expected outputs

- One implementation plan in the MealTrack backend repository.
- One implementation plan in the NutreeAI mobile repository.
- Plans cross-link this report and the existing web-funnel handoff contract.
- Plans contain phases, file touchpoints, tests, rollout gates, and ownership.

### Acceptance criteria

- Browser success never grants access or claims verified payment before webhook confirmation.
- Verified Paddle fulfillment sends exactly one active claim email despite webhook replay.
- Installed-app and app-not-installed journeys have explicit completion paths.
- A signed-out customer enters the checkout email at most once in mobile.
- A matching authenticated customer can claim without signing in again.
- The saved web plan is restored without repeating the mobile quiz.
- Paddle access comes from fetched RevenueCat `standard` state and the backend's
  enforcement cache; the browser/client never fabricates it.
- Same-email and different-email account conflicts never silently merge users.
- Expired, consumed, replayed, mismatched, revoked, and concurrent claims fail safely.
- No raw action link, claim token, bearer token, or email is emitted to analytics or logs.

### Scope

In scope:

- Paddle fulfillment.
- Firebase Email Link authentication.
- Backend lead, claim, email/receipt outboxes, RevenueCat bridge, and plan restoration.
- Flutter link handling, authentication UX, claim orchestration, and existing
  RevenueCat state refresh.
- Staging and production environment isolation.

Out of scope:

- PayPal and MoMo fulfillment implementation.
- Mandatory authentication before checkout.
- Web account/login surfaces.
- Password authentication UX.
- Automatic merges across different emails or Apple private-relay addresses.
- Replacing RevenueCat for native in-app purchases.
- Implementation changes during brainstorming.

### Non-negotiable constraints

- Paddle is billing authority. RevenueCat webhook plus fetched subscriber state is
  access authority; the direct Paddle webhook remains shadow/rollback during rollout.
- Firebase UID, email, and verified-email state come from a verified ID token.
- Existing SyncUser email fallback cannot be reused for claim identity mutation.
- Claim token is opaque, high entropy, single-use, stored hashed, and valid for 24 hours.
- Resend becomes available after 60 seconds, allows at most five attempts per hour,
  and revokes the previous active claim token.
- Different-email and Apple-relay conflicts use support-assisted recovery for MVP.
- Domain, Firebase project, app identifier, backend, and payment environment must match.
- Backend remains source of truth for calories and paid-API enforcement; RevenueCat
  remains source of truth for active `standard` access.

## Codebase Findings

### Web funnel

- Next.js 16, React 19, TypeScript, Paddle overlay, Zustand, and localized copy.
- Primary Paddle checkout sends source, plan, and funnel_lead_id correctly.
- Paddle currently redirects to /welcome, which says Payment received before webhook proof.
- Legacy browser-held claim_token and Airbridge claim-link code remains in the repo.
- The existing Phase 2 status must be reopened before ecosystem release.

### MealTrack backend

- FastAPI, SQLAlchemy async, Clean Architecture, CQRS, and PyMediator.
- Firebase ID-token verification, Paddle webhook verification, subscription mirror,
  and Resend adapter already exist.
- No implemented web-funnel lead, claim, email outbox, or RevenueCat lead bridge exists.
- Current Paddle customer linking depends on finding an existing user by email.
- SyncUserCommandHandler can replace an existing Firebase UID after an email match.
  This conflicts with the approved no-silent-merge rule.

### NutreeAI mobile

- Flutter, Riverpod 3, GoRouter, Firebase Auth, RevenueCat, Airbridge, and app_links.
- DeepLinkService currently handles log, profile, and promo links only.
- DeepLinkService logs complete incoming URIs; auth links and claim tokens require redaction.
- Auth repository and UI expose Google and Apple only.
- Android lacks a browsable App Link intent filter.
- iOS associated domains currently use app.nutree.app for every flavor.
- Subscription state is already RevenueCat-first and should stay unchanged.
- Web onboarding JSON and OnboardingData are not directly interchangeable.

## Firebase Constraints

1. Firebase requires the original email when completing Email Link sign-in.
2. Local-email optimization only works when the same app/device requested the link.
3. This design sends the link from the backend, so a new installation must ask for
   the checkout email.
4. Firebase Hosting replaces Firebase Dynamic Links for mobile email actions.
5. Hosting links open an installed app, but do not provide automatic store install
   plus deferred continuation.
6. App-not-installed users must install NutreeAI and reopen the same email, or use
   app-side resend.

## Evaluated Approaches

| Approach | Benefits | Costs and risks | Decision |
| --- | --- | --- | --- |
| Enhanced post-payment Firebase Email Link | Preserves email-first conversion, uses existing Firebase identity, moderate implementation | One mobile email re-entry for new installs; install then reopen link | Approved MVP |
| Backend magic link or OTP plus Firebase custom token | Smooth cross-device and existing same-email identity | Larger security surface, token-exchange recovery, custom auth lifecycle | Defer unless MVP metrics fail |
| Mandatory Google, Apple, or email verification before checkout | Clean identity before payment | High acquisition friction and likely checkout conversion loss | Rejected |

## Approved Customer Journey

### Browser after checkout

| State | Customer message | Allowed actions |
| --- | --- | --- |
| payment_pending | Confirming your payment. Do not pay again. | Wait, refresh status, support |
| payment_verified | Payment confirmed. Preparing your secure app link. | Wait |
| claim_email_sent | We sent a secure Nutree link to masked_email. | Open inbox, install app, resend when eligible |
| email_delivery_delayed | Your plan is safe. Email delivery is delayed. | Retry status, resend when eligible, support |
| refunded_or_revoked | This purchase no longer grants access. | Support |

The browser never receives the raw claim token and never grants entitlement.

### Email and app entry

1. Backend sends a branded Firebase Email Link only after verified Paddle fulfillment.
2. Link carries opaque claim state only in the authorized HTTPS continuation
   fragment; its HTTP path/query are token-free.
3. If NutreeAI is installed, the configured App or Universal Link opens it.
4. If NutreeAI is not installed, a vendor-free page clears the fragment before
   showing: install NutreeAI, then reopen this email.
5. App handles the authentication link before ordinary route mapping.
6. App never logs or forwards the complete URI.

### Identity decision in mobile

| Mobile state | Behavior |
| --- | --- |
| Authenticated and backend claim email matches | Silently consume the Email Link for the same UID, then claim; no visible sign-in |
| Signed out | Ask for checkout email once, complete Firebase Email Link sign-in, then claim |
| Authenticated with different email | Do not switch or merge silently; offer account switch and support |
| Link opened on another device | Ask for checkout email, then continue |
| Invalid or expired Firebase action | Preserve safe claim context, offer resend |
| Claim token consumed or revoked | Show already-claimed or recovery state; never retry entitlement mutation blindly |

### Claim completion

1. Mobile obtains a fresh Firebase ID token.
2. Backend derives UID, normalized email, and verified-email state from the token.
3. Backend atomically validates and consumes the claim.
4. Backend creates or updates the intended app user without reassigning another UID.
5. Backend associates the Paddle transaction/subscription receipt in RevenueCat
   from temporary lead UUID to the verified Firebase UID.
6. Backend materializes the saved onboarding data into a versioned plan snapshot.
7. Backend returns `access_sync_status=active|pending|refunded` and restoration status.
8. Mobile hydrates backend read models, refreshes its existing RevenueCat provider,
   and routes past the hard paywall only under the compatible access rule.

## Contract Recommendations

### Do not return raw onboarding JSON as the mobile contract

Web and mobile questionnaire models differ. Claim completion should return a
versioned restoration object, for example:

- schema_version
- onboarding_restored
- onboarding_completed
- plan_snapshot with canonical body inputs, macros, and targets
- access_sync_status and safe server retry timing

Backend recalculates derived nutrition values. Mobile must not recalculate calories.

### Keep existing RevenueCat access intact

Paddle products attach to existing RevenueCat entitlement `standard`. Mobile keeps
its current Firebase UID identity, subscription provider, purchase/restore, and
premium gates. Do not add a second access model or `/me/entitlement` endpoint.

### Separate claim from ordinary user sync

The claim application service owns strict identity matching, subscription linking,
plan restoration, and idempotent completion. It must not call the current
email-fallback UID reassignment behavior.

## Implementation Boundaries

### Backend plan owns

- Lead, claim, outbox, and webhook event persistence.
- Unauthenticated rate-limited lead creation and safe status/resend surfaces.
- Verified RevenueCat Paddle correlation through `funnel_lead_id`, plus a retained
  direct-Paddle shadow/rollback path and cross-source transaction fence.
- Firebase Admin action-link generation and Resend delivery.
- Authenticated atomic claim completion.
- Versioned plan restoration and compatible RevenueCat access-sync outcomes.
- Token redaction, observability, cleanup, and support lookup tooling.

### Mobile plan owns

- Firebase Email Link repository and Riverpod auth state-machine integration.
- Email-entry, resend, expiry, mismatch, already-claimed, offline, and support UX.
- App Link and Universal Link configuration per flavor.
- Sanitized deep-link parsing before general routing.
- Claim/access-sync Retrofit contracts.
- Typed plan restoration and additive existing-RevenueCat refresh.
- Real-device staging matrix.

### Web prerequisite

Before cross-repo staging:

- Replace unverified Payment received language with payment-status states.
- Remove browser claim-token persistence and legacy claim QR behavior.
- Expose only masked email and safe fulfillment status.
- Keep Paddle custom data correlation unchanged.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| User expects one-tap sign-in | Drop-off after email tap | Explain checkout-email requirement, use keyboard autofill, ask once |
| App missing at link open | Journey interruption | Branded install fallback, reopen-email instruction, app-side resend |
| Webhook replay or event reordering | Duplicate email or missing entitlement | Event idempotency, transactional outbox, replay tests |
| Existing UID silently replaced | Account takeover or data reassignment | Dedicated claim policy; remove sync fallback from claim path |
| Apple relay differs from checkout email | Duplicate identity | Block automatic merge; support-assisted recovery |
| RevenueCat bridge delay | Paid customer sees paywall | Truthful pending state, durable retry, preserve existing native access, no repay prompt |
| Raw URI reaches logs or analytics | Credential disclosure | Structured redacted events; never log full incoming URI |
| Web/mobile schema drift | Restored plan fails | Versioned canonical plan snapshot and contract tests |
| Flavor-domain mismatch | Production link opens wrong app/backend | Environment matrix and real-device release gate |

## Success Metrics

- RevenueCat event to claim_email_sent: p95 at most 60 seconds when providers are healthy.
- Claim email sent to claimed entitlement: at least 85 percent within 24 hours.
- Installed-app flow: at most one manual email entry and zero quiz replay.
- Matching authenticated user: one app-open action before claim progress UI.
- Resend or expiry recovery: available within two user actions.
- Silent account merges: zero.
- Duplicate claim emails from webhook replay: zero.
- Paid user routed to hard paywall after successful claim: zero.
- Paid-lead identity conflict requiring support: target below 3 percent.

## Validation Matrix

- iOS and Android; staging and production identifiers.
- App installed, app absent, and app reinstalled.
- Same-device and cross-device email opening.
- Signed out, same-email signed in, different-email signed in.
- Existing Google account, Apple account, and Apple private relay.
- Delayed, replayed, out-of-order, refunded, and revoked Paddle events.
- Expired, resent, consumed, concurrent, and mismatched claims.
- Offline during link open, Firebase completion, claim, and entitlement refresh.
- Direct/shadow/canary/RevenueCat modes; `standard` active/pending/refunded;
  native Apple purchase/restore unchanged.

## References

- Web handoff contract: ../../../docs/firebase-email-link-identity-handoff.md
- Baseline plan: ../plan.md
- Compatible Paddle/RevenueCat decision: ./260801-1315-paddle-revenuecat-compatible-web-channel.md
- Firebase Flutter Email Link authentication:
  https://firebase.google.com/docs/auth/flutter/email-link-auth
- Firebase Admin Email Action Links:
  https://firebase.google.com/docs/auth/admin/email-action-links
- Firebase Dynamic Links migration:
  https://firebase.google.com/support/dynamic-links-faq
- Firebase account linking:
  https://firebase.google.com/docs/auth/flutter/account-linking

## Next Steps

1. Freeze the shared JSON fixture and RevenueCat compatibility preflight.
2. Execute the linked backend plan in direct/shadow mode.
3. Execute the linked mobile plan without changing native subscription behavior.
4. Complete reopened web Phase 2 before ecosystem canary.
5. Promote stable cohorts through canary only after parity and rollback evidence.

## Unresolved Questions

None for planning. Exact staging and production Hosting domains remain
environment configuration inputs and must be frozen before implementation.

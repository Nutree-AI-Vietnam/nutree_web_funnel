# Mobile-First Auth Contract Research

Date: 2026-08-01

## Verdict

Ranked recommendation:

1. Backend-issued magic link -> Firebase custom token exchange.
2. Standard Firebase Email Link.

Reason: the stated UX is cross-device and one-click after checkout. Current mobile code already has Firebase sign-in, RevenueCat identity sync, deep-link plumbing, and onboarding state restoration, but the existing email-link path still requires a manual email prompt on device. That is not the same contract.

## What The Mobile App Already Does

- Auth providers are only `google` and `apple` today. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/models/auth_provider.dart:3-21`.
- Auth sync builds a backend user request with the provider enum, so any email/custom-token path must update provider modeling or backend contract. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:555-574` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_helpers.dart:58-64`.
- RevenueCat identity is refreshed after Firebase sign-in via `Purchases.invalidateCustomerInfoCache()` and `Purchases.logIn(user.uid)`. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:383-405`.
- Startup also re-identifies restored Firebase users before subscription reads. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/main.dart:366-448`.
- The auth state machine treats Firebase auth and onboarding as separate concerns, then routes based on backend onboarding completion. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:55-127` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/providers/backend_onboarding_status_provider.dart:26-83`.
- Deep links are queued until auth can be processed, and incoming links are never logged as full opaque credentials. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/services/deep_link_service.dart:72-115`.
- Router refresh watches the email-link coordinator, redemption coordinator, auth state, and subscription state. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/di/providers/routing_providers.dart:31-63`.

## DOB Contract

- Mobile onboarding stores both DOB and derived age. Age screen computes age from day/month/year and saves both. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/age_screen.dart:35-149`.
- Onboarding domain model persists `birthDay`, `birthMonth`, `birthYear`, and `age`. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/domain/entities/onboarding_data.dart:29-37` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/domain/entities/onboarding_data.dart:143-177`.
- The API DTO sends DOB fields, not `age`. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/data/models/onboarding_complete_request.dart:1-33` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/data/mappers/onboarding_mappers.dart:14-44`.
- Tests already pin this shape. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/features/onboarding/data/models/onboarding_complete_request_test.dart:6-142` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/features/onboarding/data/mappers/onboarding_mappers_test.dart:6-22`.

Implication: web must treat DOB as canonical and keep age as a derived/validated value, not a separate source of truth. If web and mobile disagree, onboarding resume logic and backend payloads drift.

## Current Email-Link State

- There is a dedicated Firebase email-link coordinator, but it only completes a link that is already present on device. It does not initiate `sendSignInLinkToEmail`. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/services/firebase_email_link_coordinator.dart:4-46`.
- Splash screen currently asks the user to re-enter the email address after the link is opened. That is the current UX conflict with the requested one-click flow. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/presentation/screens/splash_screen.dart:25-49`.
- `DeepLinkService` routes email-link and RevenueCat redemption links into the splash/auth pipeline, but it still depends on the coordinator having enough state to finish locally. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/services/deep_link_service.dart:72-115`.
- The router holds on splash whenever the email-link coordinator says it still needs email. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/presentation/router/app_router_redirect.dart:58-67`.

## Option Analysis

| Option | Fit for stated UX | Complexity | Security posture | App-not-installed recovery | Adoption risk |
| --- | --- | --- | --- | --- | --- |
| Backend-issued magic link -> Firebase custom token | Best fit. Supports one secure email click, then silent sign-in on device without retyping email. | Higher. Needs backend redemption endpoint, one-time nonce/TTL, and new mobile sign-in path. | Strong if link is single-use, short-lived, and token minting stays server-side. | Better. Web can own recovery/install fallback before the app redeems the token. | Medium. More bespoke, more moving parts, but aligned with the contract. |
| Standard Firebase Email Link | Strong Firebase support, but current app flow still asks for email on device. | Lower. Existing mobile coordinator already covers completion. | Good for email ownership verification, but requires the email to be known on the device. | Acceptable on paper; Firebase docs say the link can redirect to a URL if the app is not installed. | Low. Mature, documented, and already partially implemented here. |

## Why Custom Token Ranks First

- The requested flow is cross-device: user enters email on web, pays, clicks one email link, and the app signs in automatically.
- Standard Firebase Email Link requires the email to be available during `signInWithEmailLink()`. Firebase docs explicitly say the user signs in by clicking an email link, and the client must then use `signInWithEmailLink` with the email. The current mobile code reflects that by prompting for email on splash. See Firebase docs and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/services/firebase_email_link_coordinator.dart:18-37`.
- Firebase also documents that the link can redirect to a URL if the app is not installed, which is useful for recovery, but it does not remove the need for the extra email step in the current client flow.
- Firebase custom auth is the cleaner match for "one secure email link, then auto sign-in": the server validates the one-time redemption, mints a custom token, and the client calls `signInWithCustomToken()`. Official Firebase docs describe exactly that client handoff. See Firebase custom-token docs and custom-auth docs.

## Exact Mobile Touchpoints If You Choose Custom Tokens

Must change:

- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/services/firebase_email_link_coordinator.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/providers/firebase_email_link_provider.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/presentation/screens/splash_screen.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/services/deep_link_service.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/di/providers/routing_providers.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_helpers.dart`
- `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/models/auth_provider.dart`

Likely keep:

- RevenueCat login and restored-identity refresh paths. They should still run after Firebase auth succeeds. See `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:383-405` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/main.dart:366-448`.
- Backend onboarding sync and onboarding state gating. Those are already orthogonal to auth transport.

What to add:

- A custom-token sign-in entry point on mobile.
- A one-time redemption state object or coordinator for the email link payload.
- A backend/provider enum update so users are not mislabeled as `google` by default.
- A web fallback route for app-not-installed / app-not-yet-installed recovery.

## Exact Mobile Touchpoints If You Stay On Standard Firebase Email Link

Must keep:

- Current coordinator and splash prompt.
- Current deep-link handling and splash-based completion.

Must still fix:

- Persist or otherwise recover the email address across devices if you still want to avoid the manual prompt. Without that, the current client remains a two-step flow.
- Provider modeling still needs review if email sign-in should be a first-class auth provider instead of defaulting to Google.

## Test Matrix

Current coverage:

- Deep-link promo routing: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/core/services/deep_link_service_test.dart:5-28`
- Auth router states and subscription gating: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/features/auth/presentation/router/app_router_redirect_test.dart:24-260`
- RevenueCat restored identity sync: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/features/auth/application/providers/auth_flow_notifier_startup_test.dart:188-230`
- DOB serialization and request mapping: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/features/onboarding/data/models/onboarding_complete_request_test.dart:6-142` and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/test/features/onboarding/data/mappers/onboarding_mappers_test.dart:6-22`

Missing coverage:

- Firebase email-link coordinator unit tests.
- Custom-token redemption path tests.
- App-not-installed recovery tests.
- Wrong-email / expired-link / replayed-link tests.
- End-to-end sign-in -> RevenueCat refresh -> onboarding skip path.

Recommended additions:

- `acceptLink` rejects non-email links.
- `complete` succeeds and clears pending link state.
- `complete` fails cleanly on wrong email / expired link / network failure.
- Router holds on splash while a redemption is pending.
- Auth flow re-entitlement happens after custom-token sign-in.
- DOB parity test: web payload must produce the same DOB/age result as mobile `AgeScreen`.

## Bottom Line

If the product requirement is truly "enter email once, click one secure email link, app signs in automatically," custom-token exchange is the better fit, even though it is more work.

If the team wants the smallest change and can tolerate the current extra email prompt in the app, standard Firebase Email Link is the simpler path, but it does not satisfy the stated contract as-is.

## Sources

- Firebase email-link docs: https://firebase.google.com/docs/auth/flutter/email-link-auth
- Firebase custom-token docs: https://firebase.google.com/docs/auth/admin/create-custom-tokens
- Firebase custom-auth docs: https://firebase.google.com/docs/auth/flutter/custom-auth

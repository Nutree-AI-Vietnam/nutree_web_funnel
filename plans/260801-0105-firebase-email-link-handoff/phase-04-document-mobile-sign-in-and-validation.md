---
phase: 4
title: "Document mobile sign-in and validation"
status: pending
priority: P1
effort: "2d"
dependencies: [1, 3]
---

# Phase 4: Document mobile sign-in and validation

## Overview

Give NutreeAI mobile an implementation-ready Email Link sign-in and post-claim
flow that reuses its Firebase Auth, `app_links`, user-sync, and router patterns.

## Related Code Files

- Handoff reference: `docs/firebase-email-link-identity-handoff.md`
- Existing mobile reference: `lib/core/services/deep_link_service.dart`
- Existing mobile reference: `lib/features/auth/data/repositories/auth_repository.dart`
- Existing mobile reference: `lib/features/auth/application/providers/auth_flow_notifier.dart`
- Existing mobile reference: `android/app/src/main/AndroidManifest.xml`
- Existing mobile reference: `ios/Runner/Runner.entitlements`

## Implementation Steps

1. Enable Email/Password and Email Link providers in each matching Firebase project.
2. Configure the Firebase Hosting/custom link domain as an Android App Link and
   iOS Universal Link. The current Android manifest has no browsable `VIEW`
   filter, so add one; iOS associated domains must include the selected link domain.
3. Extend the auth repository/notifier and sign-in UI with Email Link send,
   resend, completion, failure, and cross-device email re-entry behavior.
4. Extend `DeepLinkService` to recognize email-auth links before normal route
   mapping and preserve the opaque claim token until Firebase sign-in completes.
5. After `signInWithEmailLink`, call the backend claim endpoint with a freshly
   obtained Firebase ID token, then refresh the provider-neutral entitlement and
   hydrate the stored onboarding plan.
6. Retain Google and Apple as optional existing providers. Handle an existing
   account/provider conflict with explicit sign-in-and-link or support recovery;
   never silently merge Firebase users.
7. Test same-device, cross-device, app-installed, app-not-installed, resend,
   expired/used link, mismatched email, offline, and Paddle entitlement refresh.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] Opening a paid customer’s email link signs in with Firebase and restores the plan without repeating the web quiz.
- [ ] A RevenueCat-only result cannot overwrite a verified Paddle entitlement.
- [ ] Android and iOS link behavior is tested on real staging builds.
- [ ] No raw email link or claim token is sent to analytics/crash reporting.

## Risk Assessment

- Email Link completion requires the email entered by the customer; never put that
  email in a URL. Store it locally only for same-device completion and ask again
  when it is unavailable.
- The Firebase link domain must be tested separately for dev/staging/production;
  a production link must never target staging Firebase or backend.

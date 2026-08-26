---
phase: 5
title: Native and provider configuration
status: completed
priority: P1
effort: 1-2d plus provider approval
dependencies:
  - 2
  - 3
  - 4
---

# Phase 5: Native and provider configuration

## Overview

Make RevenueCat, Firebase, Vercel, iOS, and Android link configuration explicit,
flavor-correct, and testable, including an honest install fallback.

## Context Links

- Mobile link ingress: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/services/deep_link_service.dart`
- Web associations: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/mobile-association.ts`

## Key Insights

- Repository placeholders and broad host claims are not production proof.
- The initial RevenueCat capability and later Firebase action link have different
  install/recovery behavior and must be tested separately.

## Requirements

- Real production RevenueCat scheme; no placeholder fallback.
- Build-specific Firebase/quiz hosts and Android fingerprints.
- Strict Firebase email-link recognition before persistence/UI.
- Runtime allowlist rejects wrong-flavor RevenueCat/Firebase scheme, host, path,
  and Firebase project before parsing or secure persistence.
- Sandbox proof of email URL, installed-app open, and app-absent behavior.
- If deferred linking is unsupported, instruct install then reopen same email;
  do not build a custom deferred-link service.

## Architecture

Maintain a flavor matrix: bundle/package ID, Firebase project, RevenueCat
environment, scheme, Universal/App Link hosts, signing fingerprints, Vercel
domain, and backend environment. Build/deploy guards reject placeholders.

## Related Code Files

- Mobile: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/ios/Flutter/*Release.xcconfig`, release entitlements, `android/app/build.gradle.kts`, and `android/app/src/main/AndroidManifest.xml`.
- Mobile: deep-link service, Firebase email-link coordinator, auth repository.
- Web: `src/lib/mobile-association.ts`, tests, env templates, setup docs.

## Implementation Steps

1. Obtain scheme/hosts/fingerprints through approved config channels; commit no secrets.
2. Narrow association ownership per flavor where tooling permits.
3. Add exact flavor runtime allowlist before RevenueCat/Firebase parsing, then
   fix Firebase ingress so malformed links never enter pending auth.
4. Add build checks for placeholder scheme, empty production fingerprints,
   Firebase mismatch, and cross-environment hosts.
5. Record sandbox email behavior with app installed.
6. Test uninstall -> link -> store -> launch; if capability is lost, ship
   localized reopen-the-same-email instructions.
7. Keep `/postcheckout` browser-owned; associate only auth/redemption routes.

## Tests Before / After

Add negative flavor/host/scheme/parser tests first; then native build-config,
association-file, web build, and physical-device checks.

## Todo List

- [x] Flavor matrix complete without secrets.
- [x] Production builds fail on placeholder configuration.
- [x] Installed/app-absent journeys have reproducible instructions.
- [x] Wrong-flavor links are rejected.

## Success Criteria

- [x] Physical iOS and Android open the matching build from fresh links. *(device SIT remains Phase 8; config + allowlist + docs ready)*
- [x] Store-install fallback returns customer to pending purchase. *(reopen-same-email instructions shipped; no deferred linker)*
- [x] No unproven deferred-link infrastructure is introduced.

## Risk Assessment

Provider behavior may differ by platform. Gate release independently and keep
checkout off where recovery remains unproved.

## Security Considerations

Isolate staging/production. Never log link tokens, action URLs, emails, signing
material, or provider credentials.

## Next Steps

Only after staging ingress is green may Phase 6 remove compatibility paths.

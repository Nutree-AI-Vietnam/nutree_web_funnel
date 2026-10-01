---
phase: 3
title: Contracts flags and SIT
status: completed
priority: P2
effort: 3h
dependencies:
  - 1
  - 2
---

# Phase 3: Contracts flags and SIT

## Overview

Prove TS and Dart hashes match. Document dual producers. Staging SIT for ID-token claims, owner-UID attach, later-Google, and kill-switch unstick. Do not enable the flag in production.

## Context Links

- Web hash: `nutree_web_funnel/src/lib/revenuecat/redemption-handoff.ts:66-77` (raw nested string / original URL)
- Dart hash: `web_purchase_redemption_coordinator.dart` `canonicalRedemptionLinkForHash` (nested `url` as-is; must match TS)
- Contract: `nutree_ai/docs/contracts.md` § Web purchase redemption
- Flags: `mealtrack_backend/docs/external-services.md`, `docs/api-endpoints.md`, `.env.example`

## Requirements

> **Red team #13:** Shared golden fixtures must produce identical 64-hex in Vitest and Dart. **If they diverge, change Dart** to hash the same raw string as TS (`redemption-handoff.ts`: nested `url` as-is or the original URL — not `Uri.toString()`). Do not change production web correlate.

<!-- Updated: Validation Session 1 - Dart follows TS -->

> **Red team #3:** SIT decodes the **ID token** (not the custom-token blob): `email`, `email_verified`, `sign_in_provider=custom`, claim `wf_silent_login`. If claims missing, stop — patch identity, do not return email from session.

> **Red team #12:** SIT: new-email silent login, then Google with that Gmail, **same UID**.

> **Red team #14:** After a successful silent login, flip flag **off**: app must sign out custom session and show email overlay (not skip-to-preflight 403).

- Passwordless remains fallback. Legacy claim UI still forbidden.
- Production flag stays false. Web `/postcheckout` copy out of scope.

## Architecture

```text
flag off:  RC mail → email overlay → email-link → preflight → …
flag on:   RC mail → session mint → custom token → same preflight → …
kill:      session 404 + custom without claim 403 + client signs out custom → overlay
```

## Related Code Files

- Modify: `nutree_ai/docs/contracts.md`
- Modify: `mealtrack_backend/docs/external-services.md`, `.env.example`
- Modify or add: `redemption-handoff.test.ts` + Dart hash tests with **shared** fixture strings
- Create: `plans/260916-2306-rc-hash-silent-login/reports/sit-checklist-rc-hash-silent-login.md`
- Delete: none

## Tests Before

Phase 1 + 2 regression gates green.

## Refactor

1. Golden hash vectors in both repos (same input strings).
2. Contracts: signed-in skip; signed-out silent when session 200; `home_pending_auth` may skip email prompt on that path only; dashboard still locked until `home_active`.
3. Keep: do not rely on **legacy** claim exchange UI.
4. Flag in `.env.example` default false; independent of `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`.
5. SIT checklist.

## Tests After

- [x] Shared golden: TS hex == Dart hex for ≥3 URLs.
- [ ] ID token claims as above.
- [ ] New email → `home_active` + `standard`; onboarding not replayed.
- [ ] Existing Google: same UID; later Google still that UID.
- [ ] New-email silent then Google: same UID.
- [ ] Different signed-in Nutree user: no switch; redeem not consumed.
- [ ] Anonymous user: overlay, not custom replace.
- [ ] Flag off after silent login: overlay restored (sign out custom).
- [ ] Flag off never-silent device: Phase 8 passwordless still works.
- [ ] Unknown/refunded hash: overlay, no token.

## Implementation Steps

1. Golden hash tests first. If encodings diverge, **fix Dart** to match TS; do not rewrite correlated web hashes.
2. Docs + env example.
3. Staging SIT if env available; record pass/fail. No prod flag.

## Success Criteria

- [x] Hash goldens match.
- [x] Docs match flag-off + flag-on + unstick.
- [x] SIT checklist exists; prod flag not flipped.

## Regression Gate

```bash
cd /Users/alexnguyen/Desktop/Nut/nutree_web_funnel && npm test -- src/lib/revenuecat/redemption-handoff.test.ts
cd /Users/alexnguyen/Desktop/Nut/mealtrack_backend
./.venv/bin/pytest tests/unit/api/routes/test_web_funnel_lead_routes.py tests/unit/api/routes/test_web_funnel_redemption_session.py tests/unit/infra/services/test_web_funnel_redemption_identity.py -q
cd /Users/alexnguyen/Desktop/Nut/nutree/nutree_ai
flutter test test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart
```

## Risk Assessment

Do not turn the flag on in the same staging slot as 260825 Phase 8 passwordless SIT.

## Security Considerations

Throwaway inbox. Do not paste custom tokens into the checklist.

---
phase: 4
title: "Ship compatible mobile custom-token claim before activation"
status: pending
priority: P1
effort: "1d coordination; implementation in mobile plan"
dependencies: [1, 3]
---

# Phase 4: Ship Compatible Mobile Custom-Token Claim Before Activation

## Context Links

- [Shared contract](./phase-01-freeze-cross-team-identity-contract.md)
- Mobile plan: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/`

## Overview

Keep mobile acceptance identical to the direct magic-link contract and require a
compatible native release before production web claim email can be activated.

## Requirements

- Parse the exact direct App/Universal Link into redacted memory before normal routing.
- Exchange -> `signInWithCustomToken` -> fresh ID token -> complete; no email prompt,
  `signInWithEmailLink`, or pre-completion `/users/sync` in the paid path.
- Claim route outranks auth/onboarding/subscription redirects until terminal.
- One claim-owned barrier suppresses the existing auth listener, UID-unsafe onboarding
  cache fallback, normal `/users/sync`, and router/subscription side effects until hydration.
- Restore exact DOB/profile/plan snapshot; mobile never recalculates calories.
- Reuse RevenueCat UID login/fresh CustomerInfo and current `standard` providers/gates;
  never call native restore for the web path.
- Active reaches home; pending holds progress/retry; conflict/refund is explicit.
- Generic returning email login is deferred outside this paid-claim rollout.

## Related Code Files

- No mobile implementation files in web repo. Mobile owns its linked six-phase plan.
- Web owns app-absent fallback and minimum-compatible-version activation gate.

## Implementation Steps

1. Verify fixture, provider enum, exchange/result mapping, and DOB parity tests.
2. Verify direct-link native association for every flavor and safe older-build behavior.
3. Verify auth/router races, account switch, process death, retry/recovery, and secret absence.
4. Verify native Google/Apple and RevenueCat purchase/restore/gate regression suite.
5. Ship compatible store build; only then authorize web staging/canary activation.

## Todo List

- [ ] Match mobile fixture/state/error names.
- [ ] Prove zero email entry and redirect flash.
- [ ] Prove DOB/profile/plan restoration and backend calories.
- [ ] Ship/verify compatible native build before web activation.

## Success Criteria

- [ ] One click signs in and restores home with no email/onboarding/paywall.
- [ ] App absent recovery is install then reopen same email.
- [ ] Pending never double-charges or erases existing access.
- [ ] Older/native flows show zero regression.

## Risk Assessment

Native link config cannot ship through OTA alone. Store review/cache timing must be
absorbed before enabling web email issuance.

## Security Considerations

Magic/custom/exchange/Firebase tokens remain memory-only and absent from routes,
logs, analytics, crashes, screenshots, support, clipboard, and device storage.

## Next Steps

Execute staging matrix, then activate a small web canary. Unresolved questions: none.

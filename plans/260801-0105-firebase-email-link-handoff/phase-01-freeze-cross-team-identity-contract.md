---
phase: 1
title: "Refreeze mobile-first identity and DOB contract"
status: pending
priority: P1
effort: "1-2d"
dependencies: []
---

# Phase 1: Refreeze Mobile-First Identity and DOB Contract

## Context Links

- [Mobile research](./research/researcher-mobile-first-dob-auth-contract.md)
- [Backend/web research](./research/researcher-backend-web-magic-claim.md)
- Backend plan: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/`
- Mobile plan: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/`

## Overview

Replace the previous Firebase Email Link/manual-email contract with a direct
Nutree magic-link/custom-token exchange and make mobile DOB fields canonical.

## Requirements

- Freeze endpoints: lead create/status/resend, `/claims/exchange`, `/claims/complete`,
  and authenticated `/claims/recovery`.
- Freeze tokens: `magic_token` only in direct-link fragment; `exchange_token` only
  in authenticated completion; Firebase custom/ID tokens remain standard bearers.
- Freeze link: `https://<claim-host>/open-nutree#v=2&lead_id=<uuid>&magic_token=<opaque>`.
- Freeze onboarding snapshot with `birth_year`, `birth_month`, `birth_day`; backend
  validates/derives age and calories. No fabricated DOB or independent age authority.
- Magic link authorizes exchange; custom token creates Firebase session; fresh ID
  token plus exchange token authorizes atomic completion.
- Database claim is atomic; Firebase, email, and RevenueCat calls use reservation/outbox.
- Exchange binds a hashed mobile retry secret; normal completion uses exchange token,
  while post-sign-in process death recovers through the server-minted reservation claim.
- RevenueCat Web uses lead UUID as identified App User ID; backend v2 transfer moves
  the verified web customer to Firebase UID and refetches target `standard`.
- Email is never silent merge authority. `standard` remains access authority.

## Architecture

```text
web DOB/email -> lead -> RevenueCat verified paid -> Nutree magic email
  -> mobile exchange -> Firebase custom auth -> authenticated atomic complete
  -> profile/plan/onboarding restored -> existing RevenueCat refresh -> home
```

## Related Code Files

- Modify this plan, all coordinated phase files, and canonical handoff design doc.
- Create/update shared synthetic contract fixtures in each implementation repo.

## Implementation Steps

1. Copy the same synthetic field/state/error fixtures into all three plans.
2. Remove action-link, nested continue URL, email re-entry, and `claim_token` assumptions.
3. Lock exact DOB validation/derived-age ownership and payment/access authority.
4. Lock retry proof, provisional Firebase identity, process-death recovery, RevenueCat
   v2 transfer, conflict, pending, refund, rollback, and recovery semantics.
5. Approve mobile-release-before-web-activation dependency and no-Playwright web boundary.

## Todo List

- [ ] Freeze direct-link/token/endpoint names.
- [ ] Freeze DOB and derived-age ownership.
- [ ] Freeze atomic/external-side-effect boundaries.
- [ ] Remove stale Email Link/manual-email assumptions.

## Success Criteria

- [ ] Web/backend/mobile plans describe the same direct magic-link flow.
- [ ] One paid click requires no email entry and never creates a profile before completion.
- [ ] Every conflict/replay/provider-delay state has one safe owner and result.
- [ ] Mobile availability explicitly blocks web activation.

## Risk Assessment

Custom-token flow is more bespoke than Firebase Email Link; narrow versioned
contracts, reservation fencing, and staged flags contain the complexity.

## Security Considerations

Raw keys/tokens/links/email/provider bodies never enter browser persistence,
analytics, logs, screenshots, plans, or support payloads.

## Next Steps

Phases 2-4 execute only after this refreeze is accepted. Unresolved questions: none.

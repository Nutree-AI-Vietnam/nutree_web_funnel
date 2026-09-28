---
title: RC redeem hash silent login
description: >-
  Signed-out RC redeem tap mints a Firebase custom token from the link hash,
  then reuses preflight → logIn → redeem → finalize.
status: completed
priority: P1
effort: 13h
branch: delivery
tags:
  - feature
  - backend
  - mobile
  - api
  - auth
  - critical
blockedBy: []
blocks: []
created: '2026-09-16'
createdBy: 'ck:plan'
source: skill
tdd: true
---

# RC redeem hash silent login

## Overview

RC redeem email is the one post-pay tap. App SHA-256s the canonical URL. MealTrack maps hash → `lead.email`, mints a **one-time, TTL** custom token for that email’s Nutree/Firebase owner UID (Google/Apple/password attach stays). App signs in via AuthFlow (`_signInActive`), then existing `_runActivation`: preflight → RC logIn → redeem once → finalize.

Design: `plans/reports/260916-2259-rc-hash-silent-login.md` (approved A). `--tdd`. Flag default **off**. Do not flip `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`. No Nutree/Resend mail. No web copy. No App Check. Red-team (2026-09-17) hardened mint, limiter, Dio, fallback.

## Cross-Plan Dependencies

| Relationship | Plan | Status |
|-------------|------|--------|
| Related, not blocking | `260825-2206-web-purchase-home-shell-redemption-reliability` Phase 8 SIT | in-progress |
| Must not revive | `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` / Phase 9 delete | pending |

Keep silent-login flag off while Phase 8 validates passwordless. Checkout/correlate product unchanged; phase 3 may add shared hash **test** goldens only.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Backend session and identity](./phase-01-backend-session-and-identity.md) | Completed |
| 2 | [Mobile signed-out silent login](./phase-02-mobile-signed-out-silent-login.md) | Completed |
| 3 | [Contracts flags and SIT](./phase-03-contracts-flags-and-sit.md) | Completed |

## Dependencies

- Firebase Admin already in MealTrack. Production `lib/` has **zero** `signInWithCustomToken` today — wire through AuthFlow, not a raw provider call.
- Live redeem order is preflight → `alignRevenueCat` → redeem → finalize. Do not invert.
- **Signed-out** = `FirebaseAuth.currentUser == null`. Anonymous is **not** signed-out; never exchange/replace an anonymous UID.
- `nutree_web_funnel`: no product change except a **shared hash golden** (TS + Dart) in phase 3.

## Out of scope

Quiz, paywall, IAP, ordinary sign-in, email in RC URL, Resend magic mail, App Check, web `/postcheckout` copy, last-sub-wins, Phase 9 destructive delete.

## Cook

`/ck:cook /Users/alexnguyen/Desktop/Nut/nutree_web_funnel/plans/260916-2306-rc-hash-silent-login/plan.md --tdd`

`/clear` first. Do not cook until `/ck:plan validate` if you want the interview gate.

## Red Team Review

### Session — 2026-09-17

**Findings:** 15 accepted, 1 rejected (never-mint-Google/Apple — contradicts locked attach). **Severity:** 5 Critical, 10 High.

Reports: `reports/from-code-reviewer-to-planner-red-team-security-adversary-plan-review-report.md`, `...-failure-mode-analyst-...`, `...-assumption-destroyer-...`.

| # | Finding | Severity | Disposition | Applied To |
|--:|---------|----------|-------------|------------|
| 1 | Unverified JWT `sub` bypasses limiter | Critical | Accept | Completed |
| 2 | Anonymous treated as signed-out; Dio sends Bearer | Critical | Accept | Completed |
| 3 | Custom JWT may lack email; preflight 403; stuck signed-in | Critical | Accept | Completed |
| 4 | Firebase miss + MealTrack email-owner → wrong `preflight_uid` | Critical | Accept | Phase 1 |
| 5 | Hash mint has no TTL / single-use | Critical | Accept | Phase 1 |
| 6 | Refunded/revoked/conflict still mint | High | Accept | Phase 1 |
| 7 | Session must not call mutating `preflight()` | High | Accept | Phase 1 |
| 8 | `useDifferentAccount` + restore re-runs silent login | High | Accept | Phase 2 |
| 9 | Flag-on allows any `custom` token | High | Accept | Phase 1 |
| 10 | Overlay notifies before exchange | High | Accept | Phase 2 |
| 11 | 429/5xx/hang ≠ passwordless fallback | High | Accept | Phase 2 |
| 12 | `create_user` traps later Google; `custom` mapped to GOOGLE | High | Accept | Phases 1, 3 |
| 13 | Web vs Dart hash not proven identical | High | Accept | Phase 3 |
| 14 | Flag-off does not unstick a custom session | High | Accept | Phases 2–3 |
| 15 | 12 coordinator ctors; raw custom sign-in skips `_signInActive` | High | Accept | Phase 2 |

**Rejected:** “Do not mint for existing Google/Apple from the hash.” Inbox/RC-link possession stays the magic-link model; attach remains. Hardened via #1, #5, #6, #9.

### Whole-Plan Consistency Sweep

- Files reread: `plan.md`, `phase-01-backend-session-and-identity.md`, `phase-02-mobile-signed-out-silent-login.md`, `phase-03-contracts-flags-and-sit.md`
- Decision deltas checked: 15 accepted + 1 rejected
- Reconciled stale references: signed-out = `currentUser == null`; session limiter ≠ `get_user_id_or_ip`; session ≠ mutating `preflight()`; hash goldens in phase 3; SIT filename `sit-checklist-rc-hash-silent-login.md`; effort 13h
- Unresolved contradictions: 0

## Validation Log

### Session 1 — 2026-09-17

**Trigger:** `/ck:plan validate` after red-team apply.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** How should single-use mint consume be stored?
   - Options: Nullable columns on `web_funnel_redemptions` (Recommended) | Separate hashed ticket table
   - **Answer:** Nullable columns (`silent_login_minted_at` + generation)
   - **Rationale:** One row already keyed by hash; smallest migration.

2. **[Risk]** Mint TTL after first successful session POST?
   - Options: 60 minutes (Recommended) | 15 minutes | Until finalize/refund
   - **Answer:** 60 minutes
   - **Rationale:** Same order as RC redeem / legacy claim; clock + single-use.

3. **[Assumptions]** If TS vs Dart hash fixtures diverge?
   - Options: Change Dart to hash the same raw string as TS (Recommended) | Change web TS | Stop the plan
   - **Answer:** Dart matches TS (nested query as-is, not `Uri.toString()`)
   - **Rationale:** Web already correlated production hashes; mobile must match that digest.

4. **[Tradeoffs]** MealTrack `User.provider` for a custom-token redeem?
   - Options: `AuthProvider.EMAIL_LINK` (Recommended) | new CUSTOM enum | keep GOOGLE fallthrough
   - **Answer:** Map `custom` → `EMAIL_LINK`
   - **Rationale:** VARCHAR already fits; no enum migration. Later Google is SIT, not schema.

#### Confirmed Decisions

- Mint consume: columns on `web_funnel_redemptions`.
- Mint TTL: 60 minutes from first successful mint.
- Hash canonicalization: Dart follows TS raw string.
- `_auth_provider("custom")` → `AuthProvider.EMAIL_LINK`.

#### Action Items

- [x] Phase 1: columns + 60m TTL + EMAIL_LINK map
- [x] Phase 3: Dart-follows-TS if goldens fail

#### Impact on Phases

- Phase 1: persist + TTL + provider map locked
- Phase 3: hash fix direction locked (Dart, not web correlate)

### Whole-Plan Consistency Sweep

- Files reread after propagation: plan.md + phases 1–3
- Decision deltas checked: 4
- Reconciled stale references: TTL “e.g. 60” → exactly 60m; ticket table not used
- Unresolved contradictions: 0

# Mobile-First Magic Claim Red-Team Adjudication

Date: 2026-08-02

## Inputs

- Security adversary / fact checker
- Failure-mode analyst / flow tracer
- Assumption destroyer / scope auditor
- Scope critic / contract verifier

Twenty findings were submitted: 9 Critical and 11 High. All were evidence-backed
and accepted; duplicates were consolidated into twelve corrective themes. No finding
reversed the locked user choices of exact mobile DOB parity or one-click custom auth.

## Adjudicated Findings

### 1. Live RevenueCat checkout had no lead correlation — Critical

**Disposition:** Accept.

Current Web SDK used a generated anonymous App User ID and no Paddle `customData`.
Plan now creates the lead first and configures `purchases-js` once with lead UUID as
identified `appUserId`; webhook/fetched customer must round-trip that exact known lead.

### 2. RevenueCat source-to-Firebase transfer was unproven — Critical

**Disposition:** Accept.

Plan now names the RevenueCat v2 customer transfer action, source `lead_id`, target
Firebase UID, configured web-app filter, required secret permissions, unique outbox
fence, target `standard` refetch, conflict/refund/race tests, and staging proof.

### 3. Exchange retry could not distinguish copied-link replay — Critical

**Disposition:** Accept.

Plan now binds a mobile-generated 256-bit in-memory retry secret hash to the first
reservation. Only that proof may retry an active exchange; copied-link retry fails.

### 4. Process death after Firebase sign-in stranded completion — Critical

**Disposition:** Accept.

Custom token now carries minimal reservation ID/generation claims. Authenticated
startup checks recovery before normal auth work and may complete the provisional
reservation without persisting magic/exchange credentials.

### 5. Firebase provisioning/provider conflicts were undefined — High

**Disposition:** Accept.

Plan now freezes new verified email UID, existing email-only UID, already-signed-in
matching UID, and Google/Apple/disabled/ambiguous conflict outcomes plus provisional cleanup.

### 6. Existing auth listener/router could escape before claim completion — High

**Disposition:** Accept.

One claim-owned process barrier is acquired before custom sign-in and exposed to
AuthFlowNotifier/router/subscription setup. It releases only after hydration/cancel.

### 7. Onboarding cache was not UID scoped — High

**Disposition:** Accept.

Plan now UID-scopes/verifies the cache, clears it before account switch, and forbids
cached-authenticated fallback while a claim barrier is active.

### 8. Current CQRS handlers cannot compose atomically — Critical

**Disposition:** Accept.

Plan now forbids invoking current self-committing SyncUser/SaveOnboarding handlers
inside completion. Claim uses transaction-neutral operations and owns the sole UoW/commit;
it also forbids SyncUser's email-based UID reassignment.

### 9. Concurrent first web submission could orphan capability — High

**Disposition:** Accept.

Plan now establishes an idempotent BFF session before mutation, uses one request ID
and synchronous in-flight guard, and adds explicit backend/BFF reset/revocation.

### 10. Legacy mobile paid coordinators remained global — High

**Disposition:** Accept.

Plan now has a consumer migration table: v2 magic claim owns priority; v1 Email Link
and RevenueCat redemption stay legacy/fallback-only until rollout and are barrier-gated.

### 11. DOB plan omitted existing age/training consumers — High

**Disposition:** Accept.

Claim snapshot maps exact DOB plus backend-derived current age into OnboardingData for
existing validity/resume/TDEE/macro consumers, and preserves experience/training mapping.

### 12. Web secret scrub/delete work was stale scope — High

**Disposition:** Accept.

Removed nonexistent handoff-file deletion and heuristic recursive scrub. Existing
explicit persistence allowlist is extended only for DOB and safe lead projection.

## Whole-Plan Consistency Sweep

- Files reread: all three `plan.md` files, sixteen phase files, canonical design doc,
  two research reports, and four red-team reports.
- Decision deltas checked: DOB authority, link/token names, payment correlation,
  transfer, retry proof, provisional recovery, UoW ownership, mobile barrier, rollout.
- Reconciled stale canonical references: Paddle/customData, action-link nesting,
  email re-entry, old backend plan path, handler reuse, anonymous SDK identity.
- Historical research/review reports remain evidence snapshots and are not canonical.
- Unresolved contradictions: 0.

## Recommendation

The corrected plans are ready for implementation planning handoff. Live RevenueCat
v2 transfer and provider-dashboard behavior remain staging release gates, not claims
that local plan validation has verified them.

## Unresolved Questions

None.

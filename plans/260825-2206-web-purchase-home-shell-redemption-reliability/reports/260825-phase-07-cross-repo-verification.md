# Phase 7 — Automated cross-repo verification report

Date: 2026-08-25  
Plan: `260825-2206-web-purchase-home-shell-redemption-reliability`  
Scope: Phases 1–6 code slice (not Phase 8 device SIT / Phase 9 deletion)

## Revisions (local working trees; uncommitted)

| Repo | Branch / note | HEAD |
|---|---|---|
| mealtrack_backend | `main` + local Phase 2–6 changes | `dde363f6` |
| nutree_web_funnel | `feature/simplify-webtomobile-redemption` + plan/docs | `d516c32` |
| nutree_ai | `main` + local Phase 4–7 changes | `5505f7b31` |

Secrets/capabilities: none recorded. Fixtures use synthetic emails/tokens only.

## Gate results

### Backend (`mealtrack_backend`)

| Gate | Result | Evidence |
|---|---|---|
| Focused web-funnel unit | **PASS** | 44 passed (`claim_payment`, `outbox_dispatch`, `redemption_service`, `lead_routes`) |
| CI-aligned `tests/unit` | **PASS** | 2801 passed, coverage **80.38%** (≥65%) |
| Ruff (touched modules) | **PASS** | All checks passed |
| Alembic head | **PASS** | `20260825000001` |
| Live DB upgrade/downgrade | **NOT RUN** | Requires staging DB; migration file is reversible in-repo |

### Web (`nutree_web_funnel`)

| Gate | Result | Evidence |
|---|---|---|
| Vitest full | **PASS** | 28 files / **104** tests |
| `tsc --noEmit` | **PASS** | |
| `next build` | **PASS** | Next.js 16.2.10 |
| Playwright / e2e | **SKIP** | Out of phase scope |

### Mobile (`nutree_ai`)

| Gate | Result | Evidence |
|---|---|---|
| Focused auth/redemption | **PASS** | **74** tests (coordinator, scheme allowlist, Firebase email, router, activate prompt, deep link) |
| Analyzer (touched files) | **PASS** | 1 info-only lint (`unnecessary_underscores`) |
| Staging RC scheme script | **PASS** | `check-revenuecat-redemption-scheme.sh staging` |
| Prod RC scheme script | **FAIL CLOSED (expected)** | Placeholder until ops provisions live scheme; now wired into `shorebird-release.sh` |
| Full `flutter test` | **NOT RUN** | Focused green; full suite = broader debt boundary |

## Scenario matrix vs automation

| Scenario | Automated? |
|---|---|
| Same email, fresh buyer | Yes (web handoff + backend preflight/finalize + mobile coordinator) |
| Different / wrong email | Yes (coordinator wrong-account; backend eligibility) |
| Existing account | Partial (preflight ownership paths) |
| Second purchase | Backend migration + finalize-by-hash tests |
| Missing link / correlation loss | Web recovery handoff tests; docs reopen guidance |
| Network loss after redeem | Coordinator indeterminate / no re-redeem |
| Expired | Coordinator + UI states |
| Process death | Coordinator restore + tombstone |
| Provider unknown | Coordinator finalization-only recovery |
| Finalize refresh fails | Coordinator routes Home / preserves completion |
| Wrong flavor / malformed | Scheme + Firebase allowlists; association paths |
| App absent / install | Docs + `/redeem` / `/open-nutree` / `/welcome` copy (device proof = Phase 8) |

## Code review

Verdict: **PASS_WITH_NOTES** → notes addressed in-phase:

1. Wired `check-revenuecat-redemption-scheme.sh prod` into `scripts/shorebird-release.sh` (prod iOS fail-closed).
2. `restorePendingLink` now re-checks scheme allowlist before re-parse.

Remaining ops (not code debt): provision real prod RC scheme + fingerprints before Phase 8 production enablement.

## Proof boundaries

- Automated green ≠ customer-ready. Phase 8 owns staging/prod SIT, physical link opens, kill-switch rollback.
- No fake provider success presented as release evidence.
- Production RC scheme remains placeholder by design until dashboard value is known.

## Conclusion

**Phase 7 automated gate: PASS** for the cook code slice (Phases 1–6), with documented out-of-band items (live migration apply, full Flutter suite, device SIT).

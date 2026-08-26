# Phase 8 — Staging / production SIT runbook (evidence template)

Date started: 2026-08-26  
Plan: `260825-2206-web-purchase-home-shell-redemption-reliability`  
**Do not record raw emails, action URLs, redemption URLs, tokens, or secrets.**

## Hard blockers before any deploy

| Blocker | Status |
|---|---|
| Phase 1–7 code committed + pushed (3 repos) | **BLOCKED** — working trees dirty / unpushed as of Phase 8 start |
| Backend migration `20260825000001` applied on staging | Pending deploy |
| Staging mobile build with Home shell + `rc-6eb1beb650` | Pending build/install |
| Preview web `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED=true` | Confirm after Preview redeploy |
| `WEB_FUNNEL_LEGACY_CLAIM_ENABLED=false` on staging | Confirm |
| Android fingerprints in Vercel Preview | Confirm non-empty |
| Prod RC scheme provisioned | **Not required for staging SIT**; required before prod mobile release |

Promotion order (never reverse):

```text
backend staging (migration) → mobile staging install → web Preview redemption-on
→ sandbox matrix → rollback rehearsal → prod backend → prod mobile → web prod enable
```

## Evidence log (fill per journey)

### Deploy revisions

| Layer | Env | Revision / version | Migration head | Flags |
|---|---|---|---|---|
| MealTrack | staging | | | `LEGACY=false`, redemption/admission |
| Web | Preview | | N/A | `REDEMPTION_ENABLED=` |
| Mobile iOS | staging | | N/A | scheme `rc-6eb1beb650` |
| Mobile Android | staging | | N/A | scheme `rc-6eb1beb650` |

### Staging SIT matrix

| # | Journey | iOS | Android | Pass? | Notes (redacted) |
|---|---|---|---|---|---|
| 1 | Fresh email + sandbox purchase → Home shell → email → redeem → finalize → home_active | | | | |
| 2 | Existing Firebase/MealTrack account | | | | |
| 3 | Wrong email then correct email | | | | |
| 4 | App installed: cold / warm / backgrounded / process-killed | | | | |
| 5 | App absent → store/TF → reopen **same** email | | | | |
| 6 | Firebase / RC link expiry + recovery | | | | |
| 7 | Network loss before preflight / after redeem / after finalize | | | | |
| 8 | Duplicate tap + concurrent second purchase | | | | |
| 9 | Refund / cancel / expiry lifecycle | | | | |
| 10 | Wrong-flavor rejection | | | | |

### Rollback rehearsal

| Step | Expected | Pass? |
|---|---|---|
| Set Preview `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED=false` + redeploy | New checkout blocked | |
| Already-paid session: correlation / preflight / finalize / refresh still work | Paid recovery intact | |
| Re-enable admission only after matrix green | | |

### Production (after staging green only)

| Step | Pass? | Notes |
|---|---|---|
| Backend prod + migration | | |
| Prod mobile with real RC scheme (not placeholder) | | |
| Web prod stays `REDEMPTION_ENABLED=false` until approved | | |
| One controlled live buyer | | |
| Independent admission kill switch proved | | |
| ≥1 renewal/expiry/refund observation | | |

## Exit criteria

- [ ] Physical iOS + Android staging matrices pass
- [ ] App-absent reopen works (no deferred linker)
- [ ] Revisions / migrations / flags recorded (redacted)
- [ ] Rollback preserves paid customers
- [ ] Production lifecycle proof complete (redacted)

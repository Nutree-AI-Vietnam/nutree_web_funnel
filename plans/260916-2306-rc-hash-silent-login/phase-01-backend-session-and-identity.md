---
phase: 1
title: Backend session and identity
status: completed
priority: P1
effort: 5h
dependencies: []
---

# Phase 1: Backend session and identity

## Overview

Lock current preflight/finalize/legacy identity tests. Add unauthenticated `POST /v1/web-funnel/redemptions/session` that mints a **one-time TTL** custom token from `redemption_link_hash`. New identity helper may mint for Google/Apple **owner UIDs**. Allow `custom` on preflight/finalize only when the silent-login flag is on **and** the token carries mint claim `wf_silent_login=1`.

## Context Links

- Design: [260916-2259-rc-hash-silent-login.md](../reports/260916-2259-rc-hash-silent-login.md)
- Allowlist: `mealtrack_backend/src/api/routes/v1/web_funnel.py` `_is_supported_redemption_provider`
- Legacy mint (do not reuse `resolve`): `src/infra/services/web_funnel_firebase_identity.py`
- Hash row: `src/infra/database/models/web_funnel_claim.py` `WebFunnelRedemption`
- **Do not** use `WebFunnelRedemptionService.preflight` for lookup — it writes `preflight_uid` (`web_funnel_redemption_service.py:19-42`)
- Limiter: `src/api/middleware/rate_limit.py` `get_user_id_or_ip` (unverified JWT `sub`)
- Finalize email-owner: `web_funnel_redemption_completion.py:175-181`
- Route tests: `tests/unit/api/routes/test_web_funnel_lead_routes.py`

## Requirements

> **Red team #7:** session uses a **read-only** hash → lead.email lookup. Never call `preflight()`. Session must not set `preflight_uid`.

> **Red team #5:** mint is single-use + **60 minute** TTL from first successful mint. Persist `silent_login_minted_at` + generation on `web_funnel_redemptions` (no ticket table). Second POST after consume or after TTL → 404, same body as unknown.

<!-- Updated: Validation Session 1 - columns + 60m TTL -->

> **Red team #6:** 404 (identical body) for unknown hash, `finalized_uid` set, lead.status in `{refunded, revoked, conflict}`, unverified/disabled Firebase user.

> **Red team #4:** If MealTrack `User.email` already owns `lead.email`, mint **that** `firebase_uid`. Never `create_user` a second UID. Catch Firebase `EmailAlreadyExistsError` and re-fetch. Refuse leftover `wf_` UIDs.

> **Red team #3:** Before mint, `update_user(email=lead.email, email_verified=True)` on the target UID. For `custom` preflight/finalize: if JWT lacks `email`/`email_verified`, load `auth.get_user(uid)` — do not 403 a valid owner.

> **Red team #9:** `create_custom_token(uid, {"wf_silent_login": 1})`. `_is_supported_redemption_provider` includes `custom` iff flag on **and** that claim is present. Other custom tokens stay 403.

> **Red team #1:** Session limiter **must not** use `get_user_id_or_ip`. `key_func` = IP (+ hash). Ignore `Authorization`. Test rotating unsigned JWT `sub` does not bypass.

> **Red team #12:** `_auth_provider("custom")` → `AuthProvider.EMAIL_LINK` (same as password/email-link). Do not add a CUSTOM enum. Do not `create_user` a password-provider trap when a Google UID exists.

<!-- Updated: Validation Session 1 - EMAIL_LINK map -->

- Functional: hash in → `{ custom_token }` only. No email in body.
- Non-functional: no Firebase auth dependency on session. Flag `WEB_FUNNEL_SILENT_LOGIN_ENABLED` default `false`. Legacy `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` untouched. `resolve()` still rejects non-password.

## Architecture

```text
POST /v1/web-funnel/redemptions/session
  limiter: IP+hash, ignore Authorization
  flags: REDEMPTION_ENABLED && SILENT_LOGIN_ENABLED else 404
  read-only: hash → redemption → lead
  terminal/finalized/unknown → 404
  identity: MealTrack owner UID if any, else Firebase get_user_by_email, else create_user
  consume mint (TTL + single-use) → custom_token with wf_silent_login=1
  → { "version": "redemption_session_v1", "custom_token": "..." }
```

New module: `src/infra/services/web_funnel_redemption_identity.py`. Persist mint consume on the redemption row: `silent_login_minted_at`, generation — **not** `preflight_uid`. TTL 60 minutes.

<!-- Updated: Validation Session 1 - column names -->

## Related Code Files

- Create: `mealtrack_backend/src/infra/services/web_funnel_redemption_identity.py`
- Create: `mealtrack_backend/src/api/routes/v1/web_funnel_redemption_session.py`
- Create: tests listed below
- Modify: `settings.py`, `.env.example`, `docs/external-services.md`
- Modify: request/response schemas (reuse 64-hex hash Field)
- Modify: `web_funnel.py` — gated `custom` + claim check; do not grow the file
- Modify: `main.py` if new router
- Modify: `rate_limit.py` only if adding a dedicated `get_remote_address` helper — do not change global `get_user_id_or_ip` behavior for other routes
- Modify: `_auth_provider` in `web_funnel_redemption_completion.py`
- Modify: Alembic if mint-consume columns needed
- Delete: none

## Tests Before

1. Existing finalize tests: google OK, passwordless OK, anonymous 403.
2. **Add** finalize + preflight reject `custom` when silent flag **off**.
3. **Add** `resolve()` Google/Apple → `FirebaseIdentityConflict` (do not change `resolve`).

```bash
cd /Users/alexnguyen/Desktop/Nut/mealtrack_backend
./.venv/bin/pytest tests/unit/api/routes/test_web_funnel_lead_routes.py tests/unit/infra/services/test_web_funnel_redemption_service.py -q
```

## Refactor

1. Flag default false.
2. Session route + read-only lookup + mint consume + identity rules above.
3. Preflight/finalize: `custom` + `wf_silent_login` + email match (JWT or Admin record).
4. Dedicated limiter key_func.

## Tests After

1. Flag on: silent-login custom + verified owner → preflight/finalize OK.
2. Flag on: custom **without** claim → 403.
3. Session happy path: existing Google UID, response has token, no email.
4. Session 404: unknown / finalized / refunded / revoked / conflict / unverified — **identical body**.
5. Flag off: session 404.
6. Session does not set `preflight_uid`.
7. MealTrack email-owner UID G + Firebase miss → mint G, **no** `create_user`.
8. Second mint after consume → 404.
9. Rotating unsigned Bearer `sub` still rate-limited (IP key).
10. `resolve()` Google reject still green.

## Implementation Steps

1. Tests Before; pytest green.
2. Failing Tests After.
3. Identity + session + limiter + allowlist until green.
4. Tests Before still green with flag default off.

## Success Criteria

- [x] Flag off: passwordless producer unchanged.
- [x] Flag on: one-time hash mint for **owner** UID (incl. Google/Apple).
- [x] No email in session body; no `preflight_uid` write.
- [x] Limiter not attacker-keyable via forged `sub`.
- [x] `web_funnel.py` not grown.

## Regression Gate

```bash
cd /Users/alexnguyen/Desktop/Nut/mealtrack_backend
./.venv/bin/pytest tests/unit/api/routes/test_web_funnel_lead_routes.py tests/unit/api/routes/test_web_funnel_redemption_session.py tests/unit/infra/services/test_web_funnel_redemption_identity.py tests/unit/infra/services/test_web_funnel_redemption_service.py tests/unit/app/services/test_web_funnel_claim_exchange.py -q
```

## Risk Assessment

Mint consume: `silent_login_minted_at` + generation on existing redemption row. 60m TTL. No extra table.

<!-- Updated: Validation Session 1 -->

## Security Considerations

RC-link possession = login. POST only. TTL + single-use. IP limiter. Terminal leads 404. Claim-bound `custom`.

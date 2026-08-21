# Scout Report: Onboarding V2 Age Split

## Verified Findings

- The live quiz already routes users through separate `sex` and `age` screens; the active `age` screen is `BirthDateStep`, which still collects `birth_month`, `birth_day`, and `birth_year` (`src/components/steps/registry.tsx:73`, `src/components/steps/birth-date-step.tsx:17`).
- The July onboarding-v2 spec and the unused `BodyBasicsStep` still describe one combined age + sex screen (`docs/superpowers/specs/2026-07-22-web-funnel-final-product-spec.md:169`, `src/components/steps/final-web-steps.tsx:25`).
- `BodyBasicsStep` is not safe to wire back in as-is: it stores numeric age in `birth_year` and fabricates `birth_month=1` / `birth_day=1`, while live age derivation expects a real calendar DOB (`src/components/steps/final-web-steps.tsx:30`, `src/components/steps/final-web-steps.tsx:64`, `src/lib/quiz/dob.ts:12`).
- Web TDEE preview already posts numeric `age`; the browser derives it from DOB before calling `/v1/tdee/preview` (`src/lib/api/client.ts:37`, `src/lib/quiz/dob.ts:12`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/tdee_requests.py:55`).
- Lead creation still serializes DOB into the onboarding snapshot and the backend stores it as `web_onboarding_snapshot_v1` (`src/lib/api/client.ts:94`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:157`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:162`).
- Backend claim completion and redemption completion both re-derive age from snapshot DOB and write `date_of_birth` into `UserProfile` today (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_claim_completion.py:28`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:178`).
- `UserProfile.date_of_birth` is nullable, so a true age-only web-origin profile is structurally possible if the backend stops requiring DOB for web leads (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/user/profile.py:38`).

## Cross-Repo Impact

- Frontend-only work is insufficient if DOB capture is removed. The backend must accept an age-only web snapshot or the web app would have to fabricate DOB.
- Recommended contract: additive dual-read `web_onboarding_snapshot_v2` for web leads. Accept `{ age }` without DOB for new web rows, keep legacy v1 DOB rows readable, and leave `date_of_birth=None` for age-only web-origin profiles.

## Unresolved Decisions

- Keep live slugs `sex` and `age`, or rename to spec-only `body_basics` / `body_metrics`?
  Recommendation: keep live slugs; route renames widen scope and risk analytics/progress regressions.
- Keep the web adult gate at `18-100`, or align the web snapshot validator to the backend's broader `13-120` rules?
  Recommendation: keep `18-100` for the paid web funnel and document that it is narrower than general profile APIs.
- Should mobile later ask web-origin users to optionally backfill DOB after claim?
  Recommendation: out of scope for this request; keep `date_of_birth=None` unless a downstream product need is confirmed.

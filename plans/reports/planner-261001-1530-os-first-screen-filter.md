# OS Question First Screen Implementation Plan

**Scope:** Web funnel only. No application code changed.

## Current flow

`/survey/{language}` is the only public survey URL. `SurveyPageClient` renders the landing screen first; its CTA changes the persisted `funnelScreen` to `quiz`. `currentStep` drives the quiz screen through `QUIZ_STEPS` and `STEP_COMPONENTS`, with back/progress behavior in `QuizShell`. Quiz answers live in the Zustand `data` payload, which is later sent to the TDEE/backend flow. Funnel progress is persisted in tab-scoped `sessionStorage` and normalized by `migratePersistedQuizState`.

## Implementation plan

1. Add an `operating_system` step at the front of `QUIZ_STEPS`, map it in `STEP_CHAPTERS` and `STEP_COMPONENTS`, and add English and Vietnamese question/choice copy. Start it after the existing landing CTA; keep `/survey/{language}` and the implicit client-side screen model unchanged.
2. Implement a dedicated OS choice step. Store its `ios | android` answer in a client-only Zustand field outside `OnboardingPayload`, so it cannot leak into API requests. Persist it with the existing tab-scoped state, initialize/reset it, and update migration/version handling.
3. On iOS, advance to the existing `goal` step so the rest of the funnel is unchanged. On Android, switch to a terminal filtered screen that does not expose quiz progression, email capture, or checkout. The normal Back control on the first step should still return to the landing page.
4. Handle existing session data with no OS answer so an old tab cannot silently resume past the new gate. Preserve active lead, pending checkout, and post-purchase recovery state while doing so.
5. Add focused coverage for first-step ordering/navigation/back behavior, OS-state persistence and migration, Android blocking, iOS continuation, and both locale copy trees. Use the repo’s unit/lint/build checks; no Playwright/e2e.

## Likely files

- `src/lib/quiz/steps.ts` and `src/lib/quiz/steps.test.ts`
- `src/lib/quiz/store.ts` and `src/lib/quiz/store.test.ts`
- `src/components/steps/registry.tsx` plus a focused OS choice/filter screen component
- `src/app/survey/[language]/survey-page-client.tsx`
- `src/lib/copy/en.ts` and `src/lib/copy/vi.ts`

## Unresolved product question

What should Android users see after being filtered: a localized unsupported message, a waitlist, a Play Store/app CTA, or another exit? README currently includes Android package and Play Store configuration, so the screen should not claim Android is unavailable across the product without that decision. The gate can block this funnel while copy/action remains to be confirmed.

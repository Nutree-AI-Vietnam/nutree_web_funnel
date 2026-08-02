---
phase: 1
title: "Collapse pre-checkout route"
status: pending
priority: P1
effort: "1-2h"
dependencies: []
---

# Phase 1: Collapse pre-checkout route

## Context Links

- Flow contract: `README.md:3`
- Current post-result CTA: `src/components/steps/result-promising.tsx:87`
- Current email submit path: `src/app/email/page.tsx:30`
- Current welcome-gift interstitial: `src/app/welcome-gift/page.tsx:14`
- Existing paywall guard: `src/app/paywall/paywall-page-client.tsx:74`
- Existing checkout alias guard: `src/app/checkout/page.tsx:17`

## Overview

Change the pre-checkout route chain from `result -> /email -> /welcome-gift -> /paywall` to `result -> /email -> /paywall`. Keep `/welcome-gift` alive as a compatibility redirect for stale bookmarks and QA shortcuts; do not touch quiz step order, persisted lead shape, or paywall purchase logic.

## Key Insights

- `ResultPromisingStep` already exits to `/email`, so no quiz-step reorder is needed (`src/components/steps/result-promising.tsx:87`).
- `EmailPage` currently validates, stores `{ email }`, then routes to `/welcome-gift` for both normal and local-preview paths (`src/app/email/page.tsx:31`, `src/app/email/page.tsx:39`, `src/app/email/page.tsx:41`, `src/app/email/page.tsx:45`, `src/app/email/page.tsx:50`).
- `PaywallPageClient` already refuses leadless entry and redirects back to `/email` outside local preview (`src/app/paywall/paywall-page-client.tsx:75`, `src/app/paywall/paywall-page-client.tsx:77`).
- `/welcome-gift` is only referenced by `EmailPage` and the local preview shortcut (`src/app/email/page.tsx:41`, `src/app/email/page.tsx:50`, `src/components/local-preview-tools.tsx:10`), so the blast radius is bounded.

## Requirements

- Functional: successful email submit routes straight to `/paywall`; direct `/welcome-gift` visits redirect to `/paywall` when a lead exists, else `/email`; `/paywall` missing-lead behavior stays unchanged.
- Non-functional: no Zustand migration, no new env vars, no new query params, no change to `nextRoute('result')`, no change to `lead.email` persistence.

## Architecture

1. User leaves the result step via the existing CTA to `/email` (`src/components/steps/result-promising.tsx:87`).
2. `EmailPage` validates the typed email, stores it in Zustand via `setLead(captureEmail(...))`, then routes directly to `/paywall` (`src/app/email/page.tsx:31`, `src/app/email/page.tsx:39`).
3. `/welcome-gift` becomes a thin compatibility shim that mirrors the hydration-first redirect pattern already used by `/checkout` (`src/app/welcome-gift/page.tsx:25`, `src/app/checkout/page.tsx:17`).
4. `PaywallPageClient` continues to read `lead`, `data`, locale, and `tdee` from Zustand exactly as before (`src/app/paywall/paywall-page-client.tsx:43`, `src/app/paywall/paywall-page-client.tsx:44`, `src/app/paywall/paywall-page-client.tsx:46`).

## Related Code Files

- Modify: `src/app/email/page.tsx`
- Modify: `src/app/welcome-gift/page.tsx`
- Modify: `src/components/local-preview-tools.tsx`
- No change: `src/components/steps/result-promising.tsx`
- No change: `src/app/checkout/page.tsx`
- No change: `src/lib/quiz/store.ts`

## Implementation Steps

1. Replace both `/welcome-gift` pushes in `EmailPage` with `/paywall` while keeping `trackEvent('email_captured')` and `trackEvent('email_bypassed_local')` intact (`src/app/email/page.tsx:39`, `src/app/email/page.tsx:40`, `src/app/email/page.tsx:41`, `src/app/email/page.tsx:49`, `src/app/email/page.tsx:50`).
2. Convert `/welcome-gift` from a scratch-card page into a guard-only redirect that sends existing leads to `/paywall` and missing leads to `/email`, reusing the same hydration-first pattern as `/checkout` (`src/app/welcome-gift/page.tsx:25`, `src/app/checkout/page.tsx:17`).
3. Remove or relabel the preview-tool `Gift` shortcut so local QA reflects the public route order (`src/components/local-preview-tools.tsx:7`, `src/components/local-preview-tools.tsx:10`).
4. Leave `src/lib/quiz/steps.ts` untouched so the last quiz step still exits to `/email` and the user never sees a plan selector before entering email (`src/lib/quiz/steps.ts:62`, `src/lib/quiz/steps.ts:65`).

## Todo List

- [ ] Email submit bypasses `/welcome-gift`.
- [ ] Legacy `/welcome-gift` entry remains safe.
- [ ] Preview shortcuts match the new route order.

## Success Criteria

- [ ] With a stored lead, `/email` submit lands on `/paywall` in one navigation.
- [ ] Visiting `/welcome-gift` never shows the scratch UI; it resolves immediately to `/paywall` or `/email`.
- [ ] No quiz route slug, progress index, or persisted lead shape changes.

## Risk Assessment

- Medium likelihood / Medium impact: removing the scratch screen can strand old bookmarked or QA links. Mitigation: keep the route as a redirect shim instead of deleting it in this pass.
- Low likelihood / High impact: accidental paywall entry without `lead.email` would break checkout prefill. Mitigation: preserve the existing paywall guard untouched and smoke-test leadless `/paywall`.

## Security Considerations

- Keep email local-only before checkout as today (`src/lib/api/client.ts:59`, `src/lib/api/client.test.ts:105`).
- Do not add route params, localStorage keys, or analytics payloads to carry offer state.

## Rollback Plan

Restore the two `/welcome-gift` pushes in `EmailPage`, restore the old `WelcomeGiftPage` body, and put the preview shortcut back. No persisted-state rollback is needed because `lead` shape does not change.

## Next Steps

Phase 2 can adjust surviving offer messaging after the route chain is stable. No unresolved questions.

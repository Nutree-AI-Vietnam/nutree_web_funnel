---
phase: 1
title: "Flow Freeze"
status: pending
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Flow Freeze

## Overview

Freeze exact route order, state ownership, and reuse-vs-new-screen decisions
before any UI changes. This phase is where the redesign stops being a moodboard
and becomes an executable map.

## Requirements

- Functional: map each of the 8 requested changes to one route or one existing
  screen seam.
- Functional: preserve `/quiz/[step] -> /email -> /welcome-gift -> /paywall`.
- Non-functional: avoid persisted-state churn unless a new durable field is
  unavoidable; keep reduced-motion and keyboard access first-class.

## Architecture

- Input: route slug from `src/lib/quiz/steps.ts:2-26`, component registry from
  `src/components/steps/registry.tsx:26-166`, persisted quiz state from
  `src/lib/quiz/store.ts:9-18`.
- Transform: redesigned quiz screens keep writing existing `OnboardingPayload`
  keys in `src/lib/quiz/types.ts:2-26`; modal acknowledgement stays local state.
- Output: `CalculatingStep` still resolves `previewTdee()` / fallback into
  `useQuizStore.tdee` (`src/components/steps/calculating.tsx:45-79`), and
  `EmailPage` still calls `createLead()` with `toWebFunnelSnapshot()` (`src/app/email/page.tsx:30-44`,
  `src/lib/api/client.ts:74-112`).

## Related Code Files

- Modify: `src/lib/quiz/steps.ts`, `src/lib/quiz/steps.test.ts`,
  `src/components/steps/registry.tsx`, `src/components/quiz-shell.tsx`
- Review only: `src/lib/quiz/store.ts`, `src/lib/quiz/types.ts`,
  `src/lib/api/client.ts`
- Blocked overlap: `plans/260807-1652-onboarding-v2-age-split/plan.md`

## Implementation Steps

1. Freeze the target order:
   `goal -> name_ask -> welcome -> challenges -> duration -> motivation -> reflection -> sex -> age -> height -> weight -> target_weight -> body_review -> science -> activity_level -> training_days -> training_duration -> eating_pattern -> diet -> support_style -> preview -> reassurance? -> calculating -> result -> /email -> /welcome-gift -> /paywall`
2. Reuse existing routes where possible:
   `welcome` = credibility carousel, `science` = evidence, `preview` = Flutter-style progress.
3. Add a new route only if the animated heart reassurance cannot live inside
   `preview`; if added, place it immediately before `calculating`.
4. Keep allergy/medical-care handling UI-only for v1; if screenshots imply true
   allergy capture, raise a follow-up contract decision instead of inventing new
   payload keys.
5. Confirm the age-split plan settles whether web keeps DOB-derived age or moves
   to additive age-only snapshot support before any `steps.ts` or `types.ts`
   edits start.

## Success Criteria

- [ ] Each requested redesign item has one verified file seam and one target route position.
- [ ] No backend/API change is required for the first implementation cut.
- [ ] Existing slugs remain stable except any explicitly approved additive route.

## Risk Assessment

- High: pending age-split work changes the same route/order seams. Mitigation:
  block route edits on `260807-1652-onboarding-v2-age-split`.
- Medium: too many additive screens will dilute progress and completion rate.
  Mitigation: reuse `welcome`, `science`, and `preview`; cap new route count at one.
- Medium: store migration risk if new durable fields are added. Mitigation: keep
  acknowledgement/modal state ephemeral and avoid `STORE_VERSION` bump.

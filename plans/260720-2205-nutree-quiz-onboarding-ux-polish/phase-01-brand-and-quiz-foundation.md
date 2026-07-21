---
phase: 1
title: "Brand And Quiz Foundation"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Brand And Quiz Foundation

## Overview

Introduce the actual Nutree wordmark and make the shared quiz frame feel like a
finished product without changing its routes, store data, or analytics.

## Requirements

- Functional: show one consistent wordmark on landing and quiz screens; preserve
  the existing back route, progress computation, hydration guard, and step-view event.
- Non-functional: use a local asset, reserve its dimensions to prevent layout
  shift, keep the shell usable at 375px+, and respect reduced motion.

## Architecture

`QuizShell` becomes the shared brand-bearing frame. Its header groups a compact
wordmark with the existing back affordance and progress indicator. Landing uses
the same asset through `next/image`; interactive quiz components remain client
components, while the logo itself stays a static image.

## Related Code Files

- Create: `public/nutree-logo.png` copied from the verified mobile source.
- Modify: `src/components/quiz-shell.tsx`, `src/app/page.tsx`,
  `src/app/globals.css`, `src/lib/copy/vi.ts`.
- Read before implementation: `src/app/layout.tsx`, `src/lib/quiz/steps.ts`,
  `src/lib/analytics/track.ts`.

## Implementation Steps

1. Copy the mobile `nutree-logo@3x.png` into `public/nutree-logo.png`; record
   intrinsic dimensions and render via `next/image` with an appropriate fixed
   display size and descriptive alt text.
2. Replace the landing's text-only wordmark and add a compact header brand to
   `QuizShell`. Keep the logo decorative only if the nearby page heading already
   names Nutree; otherwise use a concise brand alt label.
3. Refine shared shell spacing: stable header row, explicit progress context
   such as `Câu x/23`, a progressbar name/value, and no change to `prevRoute` or
   the current progress percentage calculation.
4. Extend existing Tailwind theme tokens only where needed for surface, focus,
   and selected-state consistency. Keep the forest/teal system and Be Vietnam
   Pro; do not introduce decorative gradients, background blobs, or a second
   font family.
5. Keep enter transitions between 150–300ms with transform/opacity only and
   preserve the existing reduced-motion override.

## Success Criteria

- [x] Landing and every quiz step use the same crisp Nutree wordmark with no CLS.
- [x] The shell still sends one `trackStepViewed(step)` event and its back button
      continues to use `prevRoute(step)`.
- [x] Progress has a programmatic name and current value; the screen still fits
      a 375px viewport without horizontal scrolling.

## Completion Notes

- `QuizShell` now renders the local `next/image` wordmark, fixed-size back
  button, `Câu x/23` text, and named progressbar without changing route logic.
- Landing renders the same local logo asset.
- 375px/430px Playwright smoke found no horizontal overflow.

## Risk Assessment

- Logo contrast/transparency may fail on the existing brand background. Check
  both the asset and its background; add a neutral surface behind it if needed,
  never alter the canonical mark.
- A header that consumes too much vertical room can push inputs below mobile
  keyboards. Keep the mark compact and retain the flex layout's bottom CTA.

## Security Considerations

No user-data or API change. Asset is copied from the owned mobile repository;
no external image URL, tracker, or unreviewed third-party script is introduced.

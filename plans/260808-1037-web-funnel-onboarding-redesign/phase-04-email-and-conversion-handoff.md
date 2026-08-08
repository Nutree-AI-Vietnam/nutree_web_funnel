---
phase: 4
title: "Email And Conversion Handoff"
status: pending
priority: P1
effort: "1d"
dependencies: [1, 3]
---

# Phase 4: Email And Conversion Handoff

## Overview

Redesign the save-plan email surface to match the supplied structure while
leaving lead creation, welcome-gift, and paywall sequencing unchanged.

## Requirements

- Functional: redesign `/email` to show stronger plan context, “what happens
  next” structure, and an optional future face/avatar asset slot.
- Functional: preserve `validate -> createLead -> setLead -> /welcome-gift`.
- Non-functional: keep the email field, error handling, and live-region behavior
  accessible; do not introduce browser-side persistence of raw purchase or auth data.

## Architecture

- Input: `EmailPage` reads `useQuizStore.data` and `email` local state
  (`src/app/email/page.tsx:17-21`).
- Transform: `submit()` validates with `isValidEmail()` then calls
  `createLead(currentEmail.trim(), data)` (`src/app/email/page.tsx:30-44`,
  `src/lib/quiz/email.ts:3-5`, `src/lib/api/client.ts:63-112`).
- Output: safe lead projection is stored in Zustand and routing continues to
  `/welcome-gift`; welcome-gift and paywall contracts remain untouched.

## Related Code Files

- Modify: `src/app/email/page.tsx`,
  `src/app/email/layout.tsx`,
  `src/components/conversion-shell.tsx`,
  `src/lib/copy/en.ts`,
  `src/lib/copy/vi.ts`
- Test/update if copy helpers change: `src/lib/copy/email-copy.test.ts`

## Implementation Steps

1. Rebuild the page structure around: headline, short plan recap / next-step
   bullets, form block, trust copy, and a reserved visual slot for a future
   face/avatar asset.
2. Keep the visual slot decorative-only for v1 so no empty asset dependency can
   block the redesign.
3. Preserve the existing submit path and dev bypass path exactly; the redesign
   changes layout/copy, not lead semantics.
4. Keep helper/error text wired to `aria-describedby` and retain explicit label,
   input mode, autocomplete, and focus recovery after invalid submit.
5. Ensure the new layout still flows cleanly into `/welcome-gift` and does not
   pull pricing or payment back ahead of lead creation.

## Success Criteria

- [ ] `/email` still creates the same lead payload and routes to `/welcome-gift`.
- [ ] The page supports an optional future avatar asset without requiring one now.
- [ ] Error, helper, and submit states remain fully keyboard/screen-reader usable.
- [ ] No auth, checkout, or BFF contract changed.

## Risk Assessment

- High: email redesign can accidentally drift into auth/payment logic. Mitigation:
  treat `submit()` and routing as locked seams.
- Medium: the future avatar slot can create awkward blank space on small screens.
  Mitigation: design it as an optional container that collapses cleanly when empty.
- Medium: copy changes can overstate what happens after payment. Mitigation:
  keep wording aligned to the existing passwordless/revenuecat handoff contract.

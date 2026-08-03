---
phase: 2
title: "Safe Redemption Handoff"
status: in-progress
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 2: Safe Redemption Handoff

## Overview

Present the post-purchase redemption link as mobile CTA or desktop QR only after correlation acknowledgement, without persisting its bearer-like value.

## Requirements

- Handle missing redemptionInfo/redeemUrl safely.
- Keep raw URL only in mounted component memory: never Zustand, storage, route state, logs, analytics, errors, or query parameters.
- Explain that mobile requires Apple, Google, or email-link sign-in with the same email used at checkout; web does not perform Firebase auth.
- Refresh/back/expiry show a capability-free recovery state and never recreate or disclose the link.
- Preserve automatic VN Vietnamese/VND and non-VN English/USD behavior.

## Tests Before

- CTA/QR, missing link, pending correlation, safe recovery, route analytics isolation, and no-store/no-referrer coverage.

## Implementation Steps

1. Retain mounted purchase component through correlation.
2. Render CTA/QR only after backend acknowledgement.
3. Use fixed safe errors and localized recovery copy.

## Success Criteria

- [ ] Mobile and desktop handoffs work without leaking redemption value.
- [ ] UI states the exact email-match requirement.

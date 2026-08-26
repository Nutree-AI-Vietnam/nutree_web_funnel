# Phase 9 compatibility inventory (from Phase 6)

Non-destructive retirement complete. Keep these until Phase 8 SIT + link/client TTL:

| Surface | Status | Delete in Phase 9 when |
|---|---|---|
| `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` + claim routes (`/resend`, `/claims/*`) | Flag default false; routes still present | Zero traffic + max issued-link TTL |
| Outbox `claim_email` job + `process_claim_email` | Enqueue gated off; dispatch gated off | Same |
| `WebFunnelClaim` magic-token columns / table | Schema retained | Separate approved migration |
| Web BFF `/api/.../resend` + `requestLeadResend` | No UI producer | After backend delete |
| `/welcome` page | Guidance only | Optional redirect-only or delete |
| Mobile `/auth/activate-plan` route | Redirects to Home | Client floor no longer hits it |

Do **not** delete credential hashes or claim rows in Phase 6/7.

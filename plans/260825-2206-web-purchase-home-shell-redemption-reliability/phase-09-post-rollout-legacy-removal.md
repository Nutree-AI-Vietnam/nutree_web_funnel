---
phase: 9
title: "Post-rollout legacy removal"
status: pending
priority: P2
effort: "1-2d plus compatibility TTL"
dependencies: [8]
---

# Phase 9: Post-rollout legacy removal

## Overview

After new-flow production proof, maximum issued-link TTL, and released-client
adoption, remove legacy consumers/schema in a reversible, evidence-gated change.

## Context Links

- Compatibility inventory: [Phase 6](./phase-06-legacy-retirement-and-docs.md)
- Production evidence: [Phase 8](./phase-08-staging-and-production-sit-and-rollback.md)

## Key Insights

- Code removal, schema removal, and credential-hash deletion have different
  reversibility and approval requirements.
- Historical inbox links need safe recovery instructions after backend deletion.

## Requirements

- Zero eligible legacy producer traffic and no supported released client depends
  on claim exchange/complete/recovery/resend.
- Preserve aggregate audit evidence and a customer support recovery response.
- Separate code removal from irreversible credential-hash data deletion.

## Related Code Files

- Backend legacy routes/services/outbox/model fields/migrations/tests.
- Web `/welcome`, resend/status/reset consumers and stale projections/types.
- Mobile obsolete activation-route/Google/Apple compatibility code and tests.
- Superseded plans/docs to archive or annotate.

## Architecture

Use disable-observe-remove: typed compatibility response first, code removal
second, explicitly approved data migration last. Keep canonical paid recovery on.

## Implementation Steps

1. Verify Phase 8 production evidence, maximum link TTL, released-client floor,
   route metrics, outbox counts, and database inventory.
2. Disable compatibility endpoints with a recoverable typed response for one
   observation window; do not delete data.
3. Remove code consumers/producers and run all Phase 7 gates.
4. Apply a separate timestamped migration for explicitly named legacy columns/
   tables only after final approval; back up/audit per database policy.
5. Re-run migrations, automated gates, production smoke recovery, and rollback.
6. Archive superseded plans and update evergreen contract/roadmap/changelog.

## Tests Before / After

Add compatibility-response and old-client fixture tests before disabling.
After removal, rerun Phase 7 plus migration rollback and production smoke recovery.

## Todo List

- [ ] Zero-use/client-adoption/TTL evidence approved.
- [ ] Compatibility disable window completed without supported traffic.
- [ ] Code removal and data deletion are separate deploy decisions.
- [ ] Final docs describe only the canonical Home-shell flow.

## Success Criteria

- [ ] No active legacy producer, consumer, route, outbox, or schema remains.
- [ ] Already-paid canonical attempts remain recoverable during rollback.
- [ ] Full Phase 7 gates and post-deploy smoke checks pass.

## Risk Assessment

Historical emails may be opened years later. Return safe current recovery/help
instructions rather than a generic 404; never resurrect deleted credentials.

## Security Considerations

Deletion reports contain counts only. Never export raw token hashes, emails, or
redemption capabilities for audit.

## Next Steps

Mark the master plan complete only after this phase and final lifecycle proof.

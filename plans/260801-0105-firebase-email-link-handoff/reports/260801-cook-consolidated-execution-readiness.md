# Consolidated Execution Readiness

Date: 2026-08-01

## External blockers first

- Firebase must be ready per environment before code cutover: Email Link enabled, authorized custom link domain, and Android/iOS App/Universal Link association for the token-free `/open-nutree` flow (`docs/firebase-email-link-identity-handoff.md:177-192`, `plans/260801-0105-firebase-email-link-handoff/plan.md:60-67`).
- RevenueCat/Paddle dashboard config must be frozen in sandbox first: entitlement stays `standard`, restore behavior must already be `Transfer to new App User ID`, and Paddle metadata key `funnel_lead_id` must map to App User ID (`docs/firebase-email-link-identity-handoff.md:66-75`, `docs/firebase-email-link-identity-handoff.md:162-175`).
- Resend sender domain and backend Firebase Admin credentials are release blockers, not app-code follow-ups (`plans/260801-0105-firebase-email-link-handoff/plan.md:65-67`).
- Production rollout also depends on a new mobile build because old builds keep native-only behavior while Email Link claim needs the new link configuration (`docs/firebase-email-link-identity-handoff.md:76-79`).

## Safe local execution order

1. Run the direct-Paddle pre-removal audit before deleting anything. The approved design requires a clean audit before removal (`docs/firebase-email-link-identity-handoff.md:22-24`, `docs/firebase-email-link-identity-handoff.md:281-289`).
2. Backend goes first, additively. Reuse the existing RevenueCat webhook path and add lead state, claim email, claim completion, resend/status, and RevenueCat receipt transfer without changing native entitlement behavior (`docs/firebase-email-link-identity-handoff.md:194-237`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260801-1137-firebase-email-link-claim-entitlement-backend/plan.md:21-35`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260801-1137-firebase-email-link-claim-entitlement-backend/plan.md:64-67`).
3. Mobile next. The claim/recovery path must land before web truthfully promises Email Link recovery, and it must reuse current Firebase UID plus RevenueCat refresh seams instead of adding a second entitlement model (`docs/firebase-email-link-identity-handoff.md:239-269`, `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/plan.md:27-35`, `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/plan.md:65-67`).
4. Web last. Keep Paddle checkout and `funnel_lead_id`, then replace browser claim-token transport with BFF-held capability, safe status polling, resend, and token-free install/login guidance (`docs/firebase-email-link-identity-handoff.md:125-175`, `docs/firebase-email-link-identity-handoff.md:177-192`, `plans/260801-0105-firebase-email-link-handoff/plan.md:71-76`).
5. Only after sandbox E2E plus mobile staging proof should direct Paddle ingress/access/portal be removed and a small production canary started (`docs/firebase-email-link-identity-handoff.md:283-318`, `plans/260801-0105-firebase-email-link-handoff/plan.md:69-76`).

## Direct-Paddle pre-removal audit evidence required

- Verified webhook ingress still exists at `src/api/routes/v1/paddle_webhooks.py:19-67`.
- Authenticated Paddle portal still exists at `src/api/routes/v1/billing.py:18-32`.
- Portal minting still depends on Paddle SDK env/config and stored Paddle customer/subscription IDs in `src/infra/services/paddle_billing_gateway.py:59-101` and `src/infra/services/paddle_client.py:6-41`.
- Direct Paddle access/cache writes still exist in `src/infra/services/paddle_fulfillment_service.py:79-95`, `src/infra/services/paddle_fulfillment_service.py:98-132`, and `src/infra/services/paddle_fulfillment_service.py:147-226`.
- Schema still persists Paddle authority in `src/infra/database/models/user/user.py:23-25` and `src/infra/database/models/subscription.py:23-29`, `src/infra/database/models/subscription.py:78-87`.
- Removal is blocked unless code scan, env/config inventory, and production/staging data checks all show zero required webhook traffic, zero portal consumers, zero live dependency on `paddle_customer_id`, and no runtime path that still grants access from `provider == "paddle"`.

## File-level implementation touchpoints

- Backend: extend existing RevenueCat reconciliation in `src/api/routes/v1/webhooks.py:55-137` and `src/api/routes/v1/webhooks.py:140-246`; current path already resolves App User IDs via Firebase UID, UUID user ID, and stored RevenueCat subscriber IDs.
- Mobile: claim/login deep-link intake is net-new on top of `lib/core/services/deep_link_service.dart:29-55` and `lib/core/services/deep_link_service.dart:66-137`; existing RevenueCat identity/setup seams are `lib/main.dart:312-315`, `lib/main.dart:366-455`, `lib/features/subscriptions/application/providers/subscription_state_provider.dart:90-127`, `lib/features/subscriptions/application/providers/subscription_state_provider.dart:176-223`, and `lib/features/subscriptions/data/datasources/revenuecat_service.dart:281-378`, `lib/features/subscriptions/data/datasources/revenuecat_service.dart:416-569`.
- Mobile paywall recovery must intercept before the current no-subscription redirects in `lib/features/auth/presentation/router/app_router_redirect.dart:184-190` and `lib/features/auth/presentation/router/app_router_redirect.dart:252-258`; account-switch/support can reuse `lib/features/auth/application/providers/auth_flow_notifier.dart:408-427` and `lib/features/auth/application/providers/auth_flow_notifier.dart:543-557`.
- Web: keep Paddle customData in `src/app/paywall/paywall-page-client.tsx:213-226`, but remove persisted/browser claim-token transport now present in `src/lib/api/client.ts:86-101`, `src/lib/api/client.ts:182-199`, `src/lib/quiz/store.ts:9-18`, `src/lib/quiz/store.ts:41-58`, `src/lib/quiz/types.ts:35-40`, `src/lib/quiz/types.ts:132-140`, `src/app/checkout/page.tsx:94-113`, `src/app/success/page.tsx:25-49`, `src/lib/handoff/links.ts:1-17`, and `src/lib/local-preview.ts:37-42`.
- Web contract requires browser-safe state to shrink to `lead_id`, `masked_email`, and safe status, with status/resend routed through a same-origin BFF and HttpOnly capability (`docs/firebase-email-link-identity-handoff.md:92-105`, `docs/firebase-email-link-identity-handoff.md:129-160`).

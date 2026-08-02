# Red-Team Failure-Modes Plan Review

## Scope

- Reviewed every `plan.md` and `phase-*.md` in the coordinated web, backend, and mobile plan folders, plus `docs/firebase-email-link-identity-handoff.md`.
- Traced current web checkout/lead state, backend auth/UoW/outbox seams, and mobile deep-link/auth/router/subscription listeners.
- Review only: no lint, build, tests, or plan edits.

## Critical Findings

### 1. Payment correlation is designed around a checkout path that does not exist

**Failure:** A paid RevenueCat subscriber cannot be deterministically joined to the web lead, so the backend cannot safely mark the lead verified or send its claim email.

**Entry -> guards -> branches -> target:** `/paywall` configures `@revenuecat/purchases-js` -> generates a fresh random anonymous RevenueCat App User ID -> purchase sends package/email/locale only -> RevenueCat webhook identifies the anonymous subscriber, not the backend lead -> backend tries to resolve `funnel_lead_id` and has no trustworthy value.

**Code evidence:**

- `src/lib/revenuecat/web.ts:1,45-50` imports the RevenueCat browser SDK and configures it with `Purchases.generateRevenueCatAnonymousAppUserId()`.
- `src/app/paywall/paywall-page-client.tsx:120-147` calls `purchases.purchase` with `rcPackage`, `customerEmail`, locale, and `skipSuccessPage`; it sends neither `funnel_lead_id` nor custom data.
- Repository search finds no runtime `funnel_lead_id` or `customData` producer under `src/`.

**Plan contradiction:** Web phase 2 claims “Paddle.js already sends `funnel_lead_id` in `customData`” and says not to add a RevenueCat browser SDK (`phase-02-prepare-web-email-link-handoff.md:31-36,84-89,164-165`), while the current code already uses RevenueCat and has no Paddle/custom-data seam. Backend phase 3 requires resolving `funnel_lead_id` (`phase-03-verified-payment-reconciliation-and-claim-email.md:26-30`); the canonical flow also assumes it (`docs/firebase-email-link-identity-handoff.md:34-38`).

**Required correction:** Refreeze the real provider contract before implementation. Specify one supported RevenueCat SDK mechanism that sets the backend lead UUID as the checkout App User ID (or a provider-supported immutable subscriber attribute that is present in webhook and fetch APIs), and prove its webhook/fetched-subscriber round trip. Do not retain the fictional Paddle.js/custom-data steps.

### 2. “Same-reservation retry succeeds, another device fails” is impossible with the frozen exchange request

**Failure:** After exchange response loss, the backend cannot distinguish the original mobile retry from a copied-link replay on another device. Either it rejects both (legitimate buyer stranded) or mints another valid Firebase custom token/exchange token for anyone holding the magic link.

**Entry -> guards -> branches -> target:** app receives link -> sends only `{lead_id, magic_token}` -> backend reserves and mints outside DB -> response is lost/crash occurs -> retry presents the identical two fields -> no client nonce, reservation receipt, or proof distinguishes original device from attacker -> retry must either remint or fail.

**Code evidence:** `DeepLinkService` stores one raw pending URI and launches handling with `unawaited` for both pending and live links (`lib/core/services/deep_link_service.dart:18-20,57-70`), so duplicate/concurrent delivery is a real caller behavior, not a theoretical input.

**Plan contradiction:** The canonical exchange request has only lead ID and magic token (`docs/firebase-email-link-identity-handoff.md:88-111`). Backend phase 4 simultaneously requires bounded same-reservation retry, forbids persistence of raw returned tokens, and says another device/generation fails closed (`phase-04-single-use-magic-link-exchange-and-firebase-identity.md:24-32,47-54`). Those guarantees cannot all hold after a post-mint/pre-response crash.

**Required correction:** Freeze a retry protocol that is cryptographically distinguishable: e.g. client-generated nonce committed in the first reservation plus a separate retry receipt/proof, or encrypted recoverable response material with strict TTL. Add explicit crash-point outcomes for before mint, after mint/before record, after record/before response, and copied-link concurrency.

## High Findings

### 3. Custom-token sign-in will trigger the existing auth listener before claim completion owns routing

**Failure:** `signInWithCustomToken` can cause an onboarding or paywall redirect and unrelated backend work before `/claims/complete`, violating the one-click/no-flash contract and creating competing state writers.

**Entry -> guards -> branches -> target:** claim coordinator calls Firebase custom sign-in -> existing `authStateChanges` listener fires -> custom flow is not the normal `_signIn` method, so `_signInActive` is false -> listener force-refreshes token and calls backend onboarding status -> new local user is not committed yet, producing 404/false -> auth state becomes onboarding -> GoRouter refresh redirects to onboarding.

**Code evidence:**

- `auth_flow_notifier.dart:45-50,171-220` suppresses listener work only while private `_signInActive` is true; otherwise every non-null auth event runs `_validateAndGetState`.
- `_validateAndGetState` calls the backend onboarding endpoint and maps 404 to incomplete (`auth_flow_notifier.dart:226-265,322-355`).
- `app_router_redirect.dart:149-165` immediately forces `AuthFlowState.onboarding` to the onboarding route.
- GoRouter refreshes from auth and subscription listeners (`routing_providers.dart:31-57`).

**Plan gap:** Mobile phases say claim routing must outrank listeners and “ensure auth listeners cannot route,” but do not define an atomic handoff API/state transition around the actual private listener guard (`phase-03-firebase-email-link-authentication.md:24-33,49-58`; `phase-04-claim-recovery-user-journey.md:23-33,44-57`).

**Required correction:** Add an explicit precondition: set a claim-owned auth barrier before invoking Firebase, make the global listener skip validation/side effects while that barrier is active, and release it only after committed-result hydration and subscription seeding. Require ordering tests that fire auth and subscription notifications at every await boundary.

### 4. The global onboarding cache can carry the previous UID across account-switch/custom-token races

**Failure:** On a network/token timeout during a paid claim, the newly signed-in UID can inherit the prior user's cached onboarding-complete value and be routed as authenticated before its claim commits.

**Entry -> guards -> branches -> target:** different account is currently signed in -> custom-token switch begins -> old per-install cache remains -> Firebase listener validates new UID -> timeout/backend error -> reads global cache -> cached `true` returns authenticated -> router may leave the claim surface for home/paywall while completion is pending.

**Code evidence:** `_cacheOnboardingStatus` and `_getCachedOnboardingStatus` use the single `CacheKeys.cachedOnboardingComplete` key with no UID binding (`auth_flow_notifier.dart:285-303`). Token timeout and backend failure both consume that cache, defaulting to authenticated when absent (`auth_flow_notifier.dart:226-242,266-281`). Cache clearing currently occurs in the full sign-out path (`auth_flow_notifier.dart:497-555`), while the keep-onboarding switch path does not clear it (`auth_flow_notifier.dart:557-575`).

**Plan gap:** Mobile phase 4 demands account-switch cleanup and no cleanup race (`phase-04-claim-recovery-user-journey.md:52-57`) but never calls out UID-scoping/clearing this existing cache or forbids timeout fallback during claim auth.

**Required correction:** Key cached onboarding state by Firebase UID (or store UID alongside and reject mismatch), clear it synchronously before switching identity, and disable cached-authenticated fallback while a claim reservation is active.

### 5. Concurrent first lead submissions can orphan the browser capability before checkout

**Failure:** Two near-simultaneous first submissions can each observe no capability cookie, generate different draft keys, and race `Set-Cookie`. The browser retains only the last key while payment may be correlated to the lead created by the other request, making status/resend inaccessible after payment.

**Entry -> guards -> branches -> target:** Enter key/click invokes submit -> React `setSubmitting(true)` is not a synchronous mutex -> planned BFF sees no HttpOnly cookie and generates key -> duplicate request does the same -> backend intentionally refuses cross-key recovery of the same email -> responses race and last cookie wins -> checkout/status may reference the losing lead/key pair.

**Code evidence:** The live email form calls the same `submit` from both Enter and button and has no synchronous ref/in-flight guard (`src/app/email/page.tsx:30-43,63-75,89-91`). The current handler is synchronous, but the plan turns it into an awaited BFF lead creation. Local reset also clears only Zustand (`src/lib/quiz/store.ts:69-88`) and cannot clear a future HttpOnly cookie.

**Plan gap:** Web phase 2 requires the BFF to generate the key and backend to hide/mutate drafts across different keys (`phase-02-prepare-web-email-link-handoff.md:55-70`); backend phase 2 tests concurrent create/checkout snapshot selection (`phase-02-lead-and-mobile-aligned-onboarding-snapshot.md:46-54`) but does not define atomic browser-session initialization or a request idempotency key. The web file list also promises cookie clearing on explicit reset but defines no reset BFF route (`phase-02-prepare-web-email-link-handoff.md:63-64,133-146`).

**Required correction:** Establish the capability cookie before lead mutation in a dedicated idempotent session endpoint, or require a browser-generated request id held in memory and conflict-safe create semantics that return the same lead/key binding. Add a server reset endpoint that revokes/clears the HttpOnly capability and define its interaction with paid/pending leads.

## Release Recommendation

Block implementation handoff until findings 1 and 2 are resolved in the frozen cross-repo contract. Findings 3-5 must become explicit implementation steps and acceptance tests before activation. The current “Unresolved questions: none” statements are false.

## Unresolved Questions

- Which supported RevenueCat Web SDK field will carry the backend lead UUID through checkout, webhook, and subscriber fetch without changing the locked payment channel?
- What proof distinguishes an original exchange retry from copied-link replay after a post-mint response loss?
- What exact state owns the mobile global auth/router barrier, and at which committed milestone is it released?

**Status:** DONE_WITH_CONCERNS
**Summary:** Five evidence-backed production failure modes found; two are contract blockers, three require explicit race/recovery mechanics.
**Concerns/Blockers:** Provider correlation and exchange retry guarantees are currently non-implementable as written.

# Tester bug bash: web funnel to backend to mobile

Date: 2026-08-09 (Asia/Ho_Chi_Minh)

## Outcome

Status: PARTIALLY VERIFIED — web, payment correlation, backend verification, and local staging UI gates passed. The remaining open gate is physical/device-capable Firebase redemption and final claim proof; mobile remains local staging.

Test account: `cutung2002bk@gmail.com`

Environment:

- Preview funnel: `https://quiz.preview.nutreeai.com/survey/vi`
- Backend: staging Render service; the simulator loaded the root JSON successfully, confirming the service was warm and reachable from the test path.
- Database: staging Neon project, read-only verification.
- Mobile: Flutter staging build `2.8.1+14`, bundle `com.nutreeai.mobile.staging`, iPhone 16 Pro iOS 18.5 Simulator through Argent.
- Payment: Paddle sandbox, 12-week plan with WELCOME50.

No redemption URLs, email-link tokens, card numbers, or bearer tokens were saved in this report.

## Passed

1. A clean Safari session completed the Vietnamese quiz through the generated plan, welcome offer, pricing confirmation, and Paddle sandbox checkout shell.
2. VND pricing, the 50% offer, plan selection, confirmation dialog, Paddle `Test Mode`, and checkout fields rendered with usable accessibility labels. The official Paddle sandbox success card completed checkout and Paddle showed `PAYMENT COMPLETE`.
3. The warmed Render root loaded MealTrack API JSON through the same simulator network path.
4. Read-only Neon verification found the newest lead from this run at `2026-08-09T03:05:46Z` with `status=payment_verified`, `payment_verified=true`, `has_redemption=true`, `verified=true`, `provider=revenuecat`, `environment=SANDBOX`, and `project=default`. It correctly remains unclaimed until mobile finalization.
5. Gmail received a fresh RevenueCat sandbox redemption email at `2026-08-09T03:09:12Z`; the raw link was not saved here.
6. Gmail received fresh Firebase staging sign-in emails at `03:14`, `03:17`, `03:32`, and `03:34 UTC`; the local staging app showed the email-link screen and resend state.
7. The focused mobile coordinator regression suite passed 18/18, focused Dart analysis passed, and the local staging iOS build completed after the lifecycle fix. The full Flutter suite remains blocked by unrelated generated-model/localization failures.
8. The blank-name skip path was reproduced as `Chào !`; the web fix now falls back to a readable locale-aware greeting and has a regression test. The pushed preview rendered accessible `Chào bạn!` after `Bỏ qua`.
9. The local iOS staging replay exposed and fixed a `ShellLayout.dispose()` Riverpod lifecycle exception. The coordinator is now retained from `initState`, so disposal does not read `ref` after unmount.

## Bugs

### BUG-01 — New sandbox payment remains an unverified draft — CLOSED

Severity: P1 / release blocker

Observed before the fix: checkout completion was not correlated after the paywall unmounted.

Retest evidence:

- Paddle visibly showed `PAYMENT COMPLETE` in sandbox.
- RevenueCat sent the sandbox redemption email.
- The newest matching Neon lead is `status=payment_verified`, `payment_verified=true`, `has_redemption=true`, `verified=true`, `provider=revenuecat`, `environment=SANDBOX`, and `project=default`.
- The row is intentionally still `claimed=false`, `preflight=true`, and `finalized=false`: the local staging replay reached backend claim eligibility, but mobile RevenueCat redemption/finalization has not completed on a device-capable target.

Expected: the newly completed purchase should create or update the matching lead to payment-verified and create the redemption record needed by mobile finalization.

Root cause identified: the web paywall persisted a safe correlation digest, attempted the BFF correlation once, and scheduled the next retry in an effect owned by the paywall. Navigating to `/postcheckout` unmounted that effect, so a transient provider-read failure left the lead in draft indefinitely.

Fix implemented: `/postcheckout` now resumes the persisted anonymous provider ID plus link digest and retries correlation for up to eight attempts without persisting the redemption URL. A successful acknowledgement clears the pending digest; exhaustion gives an explicit refresh/recovery message. The fix is in the web `delivery` handoff.

Retest: passed with the fresh Paddle sandbox payment and read-only Neon verification above. No Neon data was mutated manually.

### BUG-02 — Passwordless sign-in does not resume the pending redemption — OPEN DEVICE GATE

Severity: P1 / release blocker

Observed in the current replay:

- RevenueCat redemption links opened the local staging app and the pending redemption surface appeared.
- Firebase links were delivered through the test inbox, and the latest read-only Neon state now shows `preflight=true`; the iOS simulator still stayed on the email-link surface and did not produce finalization proof for this purchase.
- A physical/device-capable target is still required: the installed simulator app has an empty signed entitlement dictionary, so it cannot prove the `applinks:nutree-ai-staging.firebaseapp.com` Universal Link path.

Expected: after a valid Firebase email-link sign-in, the app should restore the pending RevenueCat redemption, call preflight, redeem/finalize, sync the user, and route to Home without onboarding.

Root cause addressed in local staging: the deep-link stream and lifecycle recovery can deliver equivalent Firebase wrapper/inner links more than once. Each handler invocation could start `signInWithEmailLink`; a later 400 could then cancel the authentication state while the first 200 was still completing.

Fix implemented: the Firebase coordinator now single-flights passwordless completion and remembers the completed link, so duplicate deliveries share the first result and cannot start a second sign-in attempt. The handler uses that coordinator before resuming redemption. The iOS app delegate also forwards legacy URL/user-activity callbacks alongside the scene bridge.

Retest gate: open one fresh Firebase link exactly once on a physical/device-capable staging target, then assert preflight, RevenueCat redemption, finalize, user sync, and Home/subscription state. This remains the only release-blocking gate.

### BUG-05 — Shell layout reads Riverpod ref during dispose — CLOSED

Observed: navigating from Home to the purchase-auth surface emitted repeated `Bad state: Using "ref" when a widget is about to or has been unmounted is unsafe` exceptions from `ShellLayout.dispose()`.

Fix implemented: the redemption coordinator is captured during `initState` and reused for listener removal and error checks, so `dispose()` no longer reads Riverpod after unmount.

Retest: rebuilt and relaunched local staging; the same Home → purchase-auth navigation completed without the exception in the Flutter run log.

### BUG-03 — Declining the post-payment return offer drops the user back to paywall

Severity: P2 / conversion and handoff issue

Observed: after sandbox payment, the funnel showed a 75% “come back” offer. Tapping “No, thanks” returned to the paywall and did not show a clear email/mobile handoff or completion confirmation.

Expected: the post-checkout state should explain that the redemption email and app sign-in steps are next, with a clear completion or recovery path.

Fix implemented: successful purchase completion now wins over checkout DOM teardown; a post-payment close/return-offer unmount is no longer treated as user cancellation before RevenueCat resolves the completed purchase. The post-checkout page also provides the explicit handoff and retry state.

### BUG-04 — Skipping the name produced an unfinished greeting

Severity: P2 / UX polish

Observed: on the live Vietnamese preview, choosing `Bỏ qua` on the name step rendered `Chào !` on the next screen.

Root cause: `WelcomeStep` replaced `[name]` with an empty string instead of using the locale fallback already defined for reflection copy.

Fix implemented: the shared greeting now trims names and falls back to the locale-aware lowercase friendly name (`bạn`/`friend`). Focused regression coverage passes.

Retest: passed on a second clean iPhone 16 iOS 18.5 simulator after the `delivery` push; the preview rendered accessible `Chào bạn!` after `Bỏ qua`.

## Considerations

- The target-weight step initially did not advance until “I do not have a specific number” was selected. This may be intentional, but it is worth confirming with product because the Continue action appeared inert.
- Safari’s bottom toolbar overlapped the hosted checkout submit area at the first scroll position; another upward scroll exposed the button. This was recoverable but made the payment step look unresponsive.
- iOS simulator keyboard/autocorrection altered non-ASCII test cardholder text. ASCII `John Doe` was accepted; consider disabling autocorrection or validating the field with clearer inline feedback for QA reliability.
- Argent reported an available tool update. It was not applied during this run because updating the test harness was outside the requested test scope.
- Full Flutter `test` is not a clean baseline: unrelated meal-scanner/meal-edit generated-model and localization compile errors remain outside this handoff. The changed passwordless/deep-link suite passes 18/18.
- Full web `npm run lint` is also blocked by existing `.codex/skills/*` CommonJS helper-script violations; changed application files pass targeted ESLint and the production build.
- Live behavior after the `delivery` push confirms BUG-04 is closed; exact hosting revision metadata was not exposed by the preview UI.

## Unresolved questions

- After a fresh mobile rebuild on a device-capable target, does Firebase link completion produce preflight, finalize, user sync, and Home on the same session?

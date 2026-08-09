# Tester bug bash: web funnel to backend to mobile

Date: 2026-08-09 (Asia/Ho_Chi_Minh)

## Outcome

Status: PARTIALLY VERIFIED — the web funnel, backend warm-up, and pushed skipped-name UX fix passed on clean simulator sessions. Mobile remains local staging. Payment completion and physical-device Firebase redemption are still open gates.

Test account: `cutung2002bk@gmail.com`

Environment:

- Preview funnel: `https://quiz.preview.nutreeai.com/survey/vi`
- Backend: staging Render service; the simulator loaded the root JSON successfully, confirming the service was warm and reachable from the test path.
- Database: staging Neon project, read-only verification.
- Mobile: Flutter staging build `2.8.1+14`, bundle `com.nutreeai.mobile.staging`, iPhone 16 Pro iOS 18.5 Simulator through Argent.
- Payment: Paddle sandbox, one-week plan with WELCOME50.

No redemption URLs, email-link tokens, card numbers, or bearer tokens were saved in this report.

## Passed

1. A clean Safari session completed the Vietnamese quiz through the generated plan, welcome offer, pricing confirmation, and Paddle sandbox checkout shell.
2. VND pricing, the 50% offer, plan selection, confirmation dialog, Paddle `Test Mode`, and checkout fields rendered with usable accessibility labels. No charge was submitted because no approved test card was available.
3. The warmed Render root loaded MealTrack API JSON through the same simulator network path.
4. Read-only Neon verification found a new lead from this run at `2026-08-09T02:35:37Z`, still correctly `draft`/`pending` before payment; no redemption row existed before payment.
5. Gmail received a fresh Firebase staging sign-in email at `2026-08-09T02:39:28Z` with Firebase authentication metadata. The raw link was not saved here.
6. The local staging app sent the fresh link and showed `Resend link` plus `Check your inbox for the sign-in link.`
7. The focused mobile coordinator regression suite passed 8/8. The full Flutter suite remains blocked by unrelated generated-model/localization failures.
8. The blank-name skip path was reproduced as `Chào !`; the web fix now falls back to a readable locale-aware greeting and has a regression test (3/3 focused tests passed).

## Bugs

### BUG-01 — New sandbox payment remains an unverified draft

Severity: P1 / release blocker

Observed:

- Checkout visibly completed and RevenueCat sent a redemption email.
- The newest matching Neon lead was still `status=draft`, `payment_verified=false`, `claimed=false`, `access_sync_status=pending`.
- That lead had zero redemption rows.
- A previous lead for the same test email was already claimed and active, so the account contains historical success; the new purchase was not linked to that active state.

Expected: the newly completed purchase should create or update the matching lead to payment-verified and create the redemption record needed by mobile finalization.

Root cause identified: the web paywall persisted a safe correlation digest, attempted the BFF correlation once, and scheduled the next retry in an effect owned by the paywall. Navigating to `/postcheckout` unmounted that effect, so a transient provider-read failure left the lead in draft indefinitely.

Fix implemented: `/postcheckout` now resumes the persisted anonymous provider ID plus link digest and retries correlation for up to eight attempts without persisting the redemption URL. A successful acknowledgement clears the pending digest; exhaustion gives an explicit refresh/recovery message. The fix is in the web `delivery` handoff; this run did not submit a card, so the post-payment correlation remains unverified.

Retest gate: deploy the web fix, run a fresh checkout after confirming the preview Paddle sandbox webhook/provider mapping, then verify the newest lead changes state and has a redemption row without manually mutating Neon. If RevenueCat returns no redemption metadata at purchase completion, the flow still fails closed and provider configuration must be corrected rather than bypassing link binding.

### BUG-02 — Passwordless sign-in does not resume the pending redemption

Severity: P1 / release blocker

Observed:

- Opening the fresh Firebase email link returned to the staging app, but the app stayed on the email sign-in screen with the resend state; it did not reach Home.
- The latest native Firebase `emailLinkSignin` response was HTTP 200, but no subsequent `/v1/web-funnel/redemptions/preflight`, `/v1/web-funnel/redemptions/finalize`, or `/v1/users/sync` response appeared.
- The device therefore had no proof of finalization, user sync, or active access for this new purchase.

Expected: after a valid Firebase email-link sign-in, the app should restore the pending RevenueCat redemption, call preflight, redeem/finalize, sync the user, and route to Home without onboarding.

Root cause identified: the deep-link stream and lifecycle recovery can deliver equivalent Firebase wrapper/inner links more than once. Each handler invocation could start `signInWithEmailLink`; a later 400 could then cancel the authentication state while the first 200 was still completing.

Fix implemented: the Firebase coordinator now single-flights passwordless completion and remembers the completed link, so duplicate deliveries share the first result and cannot start a second sign-in attempt. The handler uses that coordinator before resuming redemption.

Retest gate: rebuild the local staging mobile app, open one fresh Firebase link exactly once on a physical/device-capable staging target, and assert the three backend routes plus Home/subscription state. Argent’s direct iOS simulator URL path returned to the email screen; it cannot prove physical-device universal-link delivery here, and the installed simulator app has no signed associated-domain entitlement.

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
- Full Flutter `test` is not a clean baseline: unrelated meal-scanner/meal-edit generated-model and localization compile errors remain outside this handoff. The changed passwordless/deep-link suite passes.
- Full web `npm run lint` is also blocked by existing `.codex/skills/*` CommonJS helper-script violations; changed application files pass targeted ESLint and the production build.
- Live behavior after the `delivery` push confirms BUG-04 is closed; exact hosting revision metadata was not exposed by the preview UI.

## Unresolved questions

- Has the preview Paddle sandbox webhook/provider mapping been deployed and verified for the current RevenueCat anonymous app-user flow?
- After the web delivery deployment and a fresh payment, does the newest Neon lead become payment-verified and gain a redemption row?
- After a fresh mobile rebuild on a device-capable target, does Firebase link completion produce preflight, finalize, user sync, and Home on the same session?

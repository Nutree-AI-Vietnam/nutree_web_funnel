# Email Sign-In Screen and Firebase Link Fix — Web Fallback

## Expected output

- A browser fallback at `/auth/email-link` for Firebase email links that do not open the mobile app.

## Acceptance criteria

- The route renders a clear instruction to open Nutree on a phone.
- It provides app-store and app-open actions without Firebase authentication in the browser.
- It does not display or persist Firebase action tokens.
- Production build and focused web tests pass.

## Scope boundary

- No browser Firebase SDK or passwordless authentication.
- No changes to checkout, payment, or RevenueCat correlation.

## Touchpoints

- `src/app/auth/email-link/page.tsx`
- Web route/build validation.

# Passwordless RevenueCat Redemption Handoff — Web

## Status

Implemented locally; staging provider and mobile-device validation remain.

## Scope

Keep anonymous RevenueCat checkout correlation and hash-only handling. After a
successful checkout, navigate to `/postcheckout` with instructions to check the
RevenueCat email, open the link in Nutree, and complete normal passwordless sign-in.
The browser never authenticates Firebase or grants access.

## Files

- `src/app/paywall/paywall-page-client.tsx`
- `src/app/postcheckout/page.tsx`
- `src/lib/copy/en.ts`
- `src/lib/copy/vi.ts`
- related tests

## Acceptance

- Redemption-enabled checkout routes to `/postcheckout` after payment.
- The page explains the email/app/passwordless flow in English and Vietnamese.
- Existing anonymous correlation, reload recovery, and browser security behavior stay intact.
- Web tests and production build pass.

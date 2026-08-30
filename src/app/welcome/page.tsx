import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Continue your Nutree purchase from checkout email.',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Legacy claim UI retired (Phase 6). This page no longer polls lead status or
 * offers magic-link resend. Canonical recovery: open the RevenueCat redemption
 * email on your phone, or return to /postcheckout if the browser still has the
 * session digest.
 */
export default function WelcomePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-border-brand bg-white p-8 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)]">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">
          Continue on your phone
        </p>
        <h1 className="mt-4 text-[clamp(2.4rem,8vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.06em] text-forest">
          Open your Nutree redemption email.
        </h1>
        <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand">
          Magic-link claim from this page is retired. After web checkout, open the
          redemption link from your checkout email in the Nutree app, then sign in
          with the same email. If this browser still has your checkout session, you
          can also return to post-checkout.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/postcheckout"
            className="rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-deep"
          >
            Return to post-checkout
          </Link>
          <Link
            href="/survey/vi"
            className="rounded-full border border-border-brand px-6 py-3 text-sm font-extrabold text-emerald-deep transition hover:border-teal-brand/60"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

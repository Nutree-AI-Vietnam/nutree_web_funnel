import type { Metadata } from 'next';
import Link from 'next/link';
import { WelcomeStatus } from './welcome-status';

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Welcome to Nutree Premium.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function WelcomePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-border-brand bg-white p-8 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)]">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">Continue checkout</p>
        <h1 className="mt-4 text-[clamp(2.4rem,8vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.06em] text-forest">
          Return to your Nutree checkout.
        </h1>
        <WelcomeStatus />
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/survey/vi" className="rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-deep">
            Back home
          </Link>
          <Link href="/survey/vi" className="rounded-full border border-border-brand px-6 py-3 text-sm font-extrabold text-emerald-deep transition hover:border-teal-brand/60">
            Need help?
          </Link>
        </div>
      </section>
    </main>
  );
}

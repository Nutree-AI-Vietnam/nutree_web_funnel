import type { Metadata } from 'next';
import Link from 'next/link';

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
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">Payment received</p>
        <h1 className="mt-4 text-[clamp(2.4rem,8vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.06em] text-forest">
          Welcome to Nutree Premium.
        </h1>
        <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand">
          Your subscription is being set up. Open the Nutree app or continue the quiz to finish your plan.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/quiz/goal" className="rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-deep">
            Continue quiz
          </Link>
          <Link href="/" className="rounded-full border border-border-brand px-6 py-3 text-sm font-extrabold text-emerald-deep transition hover:border-teal-brand/60">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}


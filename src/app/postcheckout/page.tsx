import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Your Nutree plan is ready',
  description: 'Finish setting up your Nutree plan in the mobile app.',
  robots: { index: false, follow: false },
};

export default function PostcheckoutPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="w-full max-w-xl rounded-[2rem] border border-border-brand bg-white p-8 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-teal-brand">Payment complete</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.055em] text-forest">Your Nutree plan is ready.</h1>
        <p className="mt-5 text-base font-semibold leading-relaxed text-slate-brand">
          Check your checkout email for the Nutree redemption link. Open it on your phone, then use the normal passwordless sign-in flow with the same email address.
        </p>
        <ol className="mx-auto mt-7 max-w-md space-y-3 text-left text-sm font-semibold text-slate-brand">
          <li><span className="mr-2 font-extrabold text-forest">1.</span>Check the email you used at checkout.</li>
          <li><span className="mr-2 font-extrabold text-forest">2.</span>Open the redemption link in Nutree.</li>
          <li><span className="mr-2 font-extrabold text-forest">3.</span>Sign in normally with the passwordless email link.</li>
        </ol>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/redeem" className="rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white">Open Nutree</Link>
          <Link href="/survey/vi" className="rounded-full border border-border-brand px-6 py-3 text-sm font-extrabold text-emerald-deep">Need help?</Link>
        </div>
      </section>
    </main>
  );
}

import { ClearFragmentBeforeRender } from '../open-nutree/clear-fragment-before-render';
import { redeemMetadata } from './security';

export const metadata = redeemMetadata;

export default function RedeemPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <ClearFragmentBeforeRender path="/redeem" />
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">Continue your redemption on your phone.</h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">
          Open Nutree on your phone, then use the normal passwordless sign-in flow with the same email address you used at checkout.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a href="nutree://open-nutree" className="rounded-full bg-forest px-5 py-3 font-extrabold text-white">Open Nutree</a>
          <a href={process.env.NEXT_PUBLIC_APPSTORE_URL} className="rounded-full bg-forest px-5 py-3 font-extrabold text-white">App Store</a>
          <a href={process.env.NEXT_PUBLIC_PLAYSTORE_URL} className="rounded-full border border-border-brand px-5 py-3 font-extrabold text-forest">Google Play</a>
        </div>
      </section>
    </main>
  );
}

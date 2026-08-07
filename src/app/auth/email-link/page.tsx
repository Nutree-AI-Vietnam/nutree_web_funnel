type FirebaseEmailLinkPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function firebaseActionLinkFromQuery(search: string): string | null {
  const params = new URLSearchParams(search);
  const candidate = params.get('link') ?? params.get('plink');
  return candidate?.trim() || null;
}

export function firebaseEmailAppLink(actionLink: string): string {
  return `nutree://open-nutree?link=${encodeURIComponent(actionLink)}`;
}

export default async function FirebaseEmailLinkFallbackPage({
  searchParams,
}: FirebaseEmailLinkPageProps) {
  const params = await searchParams;
  const actionLink =
    (typeof params.link === 'string' && params.link.trim()) ||
    (typeof params.plink === 'string' && params.plink.trim()) ||
    null;
  const openNutreeHref = actionLink
    ? firebaseEmailAppLink(actionLink)
    : 'nutree://open-nutree';

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">Open this link in Nutree.</h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">
          Open Nutree on your phone to finish signing in securely. If the app is not installed, install it first and then open the email link again.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a href={openNutreeHref} className="rounded-full bg-forest px-5 py-3 font-extrabold text-white">Open Nutree</a>
          <a href={process.env.NEXT_PUBLIC_APPSTORE_URL} className="rounded-full bg-forest px-5 py-3 font-extrabold text-white">App Store</a>
          <a href={process.env.NEXT_PUBLIC_PLAYSTORE_URL} className="rounded-full border border-border-brand px-5 py-3 font-extrabold text-forest">Google Play</a>
        </div>
      </section>
    </main>
  );
}

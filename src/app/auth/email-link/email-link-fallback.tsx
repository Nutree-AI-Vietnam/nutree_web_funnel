'use client';

import type { MouseEvent } from 'react';

const fallbackOpenAppHref = 'nutree://open-nutree';

export function nutreeEmailLinkHandoffHref(currentUrl: string): string {
  try {
    const url = new URL(currentUrl);
    if (url.searchParams.get('mode') !== 'signIn' || !url.searchParams.has('oobCode')) {
      return fallbackOpenAppHref;
    }
    return `${fallbackOpenAppHref}?email_link=${encodeURIComponent(url.toString())}`;
  } catch {
    return fallbackOpenAppHref;
  }
}

export function EmailLinkFallback() {
  function handleOpenApp(event: MouseEvent<HTMLAnchorElement>) {
    event.currentTarget.href = nutreeEmailLinkHandoffHref(window.location.href);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">Return to Nutree</h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">
          This secure sign-in link needs the Nutree app to finish activating your plan.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={fallbackOpenAppHref}
            onClick={handleOpenApp}
            rel="noreferrer"
            className="rounded-full bg-forest px-5 py-4 font-extrabold text-white"
          >
            Open Nutree
          </a>
          <p className="text-sm font-medium leading-relaxed text-slate-brand">
            If the app is not installed, install it first and then open this email again on your phone.
            If the app is already open, keep it open while you tap the link.
          </p>
        </div>
      </section>
    </main>
  );
}

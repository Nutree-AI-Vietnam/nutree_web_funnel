'use client';

import { useEffect, useRef, useState } from 'react';
import { NutreeLogo } from '@/components/nutree-logo';

type State = 'working' | 'done' | 'failed';

/** Reminder opt-out from an email link; the signed lead id travels in the fragment. */
export default function UnsubscribePage() {
  const [state, setState] = useState<State>('working');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    window.history.replaceState({}, document.title, '/unsubscribe');
    const leadId = params.get('lead');
    const signature = params.get('sig');
    if (!leadId || !signature) {
      window.setTimeout(() => setState('failed'), 0);
      return;
    }
    fetch('/api/web-funnel/unsubscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, signature }),
    })
      .then((res) => setState(res.ok ? 'done' : 'failed'))
      .catch(() => setState('failed'));
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-center">
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-8 shadow-[0_24px_70px_rgb(23_69_58_/_0.10)]">
        <NutreeLogo className="mx-auto h-14 w-14" />
        <h1 className="mt-5 text-2xl font-extrabold text-forest">
          {state === 'done' ? 'You are unsubscribed' : state === 'failed' ? 'This link did not work' : 'Unsubscribing…'}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-brand">
          {state === 'done'
            ? 'We will not send you more plan reminders. Receipts and your app link still arrive if you buy.'
            : state === 'failed'
              ? 'Email support@nutreeai.com and we will remove you by hand.'
              : 'One moment.'}
        </p>
      </section>
    </main>
  );
}

'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  completeFirebaseEmailLinkSignIn,
  isFirebaseEmailLink,
  readEmailForEmailLinkCompletion,
} from '@/lib/firebase/email-link';

type CompletionState = 'checking' | 'needs_email' | 'signing_in' | 'complete' | 'invalid' | 'error';

export default function OpenNutreePage() {
  const [state, setState] = useState<CompletionState>('checking');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    let active = true;
    const finish = async (emailAddress: string) => {
      if (submitted.current) return;
      submitted.current = true;
      setState('signing_in');
      setError(null);
      try {
        await completeFirebaseEmailLinkSignIn(emailAddress, window.location.href);
        if (active) {
          window.history.replaceState({}, document.title, '/open-nutree');
          setState('complete');
        }
      } catch {
        submitted.current = false;
        if (active) {
          setError('We could not complete this sign-in. Check the email address and request a new link if it has expired.');
          setState('needs_email');
        }
      }
    };

    void isFirebaseEmailLink(window.location.href)
      .then((valid) => {
        if (!active) return;
        if (!valid) {
          setState('invalid');
          return;
        }
        const sameDeviceEmail = readEmailForEmailLinkCompletion();
        if (!sameDeviceEmail) {
          setState('needs_email');
          return;
        }
        setEmail(sameDeviceEmail);
        void finish(sameDeviceEmail);
      })
      .catch(() => {
        if (active) {
          setError('We could not verify this sign-in link. Please request a new one from Nutree.');
          setState('error');
        }
      });

    return () => { active = false; };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'signing_in') return;
    submitted.current = false;
    setState('signing_in');
    setError(null);
    void completeFirebaseEmailLinkSignIn(email, window.location.href)
      .then(() => {
        window.history.replaceState({}, document.title, '/open-nutree');
        setState('complete');
      })
      .catch(() => {
        setError('We could not complete this sign-in. Check the email address and request a new link if it has expired.');
        setState('needs_email');
      });
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6faf7] px-5 text-charcoal">
      <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree sign-in</p>
        {state === 'checking' && <p className="mt-5 text-base font-semibold text-slate-brand" role="status">Checking your secure sign-in link…</p>}
        {state === 'signing_in' && <p className="mt-5 text-base font-semibold text-slate-brand" role="status">Signing you in securely…</p>}
        {state === 'complete' && <>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">You’re signed in to Nutree.</h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">Open the Nutree app on the phone where you received your activation link to finish Premium activation.</p>
        </>}
        {(state === 'needs_email' || state === 'error') && <>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">Confirm your email</h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">For your security, enter the email address that received this link. This is required when you open it on another device.</p>
          <form className="mt-6 space-y-3" onSubmit={submit}>
            <label className="block text-left text-sm font-bold text-forest" htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-border-brand px-4 text-base text-charcoal outline-none focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/20" />
            <button type="submit" className="min-h-12 w-full rounded-full bg-forest px-5 text-base font-extrabold text-white transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">Continue securely</button>
          </form>
        </>}
        {state === 'invalid' && <>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">This sign-in link is no longer valid.</h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">Return to Nutree and request a fresh sign-in email.</p>
        </>}
        {error && <p className="mt-4 text-sm font-semibold text-error-brand" role="alert">{error}</p>}
      </section>
    </main>
  );
}

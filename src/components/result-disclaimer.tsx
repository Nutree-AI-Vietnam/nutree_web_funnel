'use client';

import { optionalConsentCopy } from '@/lib/copy/optional-consent-copy';
import { useLocale } from '@/lib/copy/use-copy';

/** Sits next to member quotes. It does not turn those quotes into proof. */
export function ResultDisclaimer({ className = '' }: { className?: string }) {
  const text = optionalConsentCopy[useLocale()].disclaimer;
  return <p className={`text-center text-[0.8rem] font-semibold leading-snug text-slate-brand ${className}`}>{text}</p>;
}

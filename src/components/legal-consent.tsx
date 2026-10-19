'use client';

import { useCopy } from '@/lib/copy/use-copy';
import { cn } from '@/lib/utils';

/** Terms and privacy notice shown before the quiz continues. */
export function LegalConsent({ className }: { className?: string }) {
  const { legal } = useCopy().landing;
  return (
    <p className={cn('text-center text-[clamp(11px,1.35vh,14px)] leading-snug text-muted-brand', className)}>
      {legal.prefix}
      <a href={legal.termsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline decoration-forest/30 underline-offset-2 transition hover:decoration-forest">{legal.terms}</a>
      {legal.connector}
      <a href={legal.privacyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline decoration-forest/30 underline-offset-2 transition hover:decoration-forest">{legal.privacy}</a>
      {legal.suffix}
    </p>
  );
}

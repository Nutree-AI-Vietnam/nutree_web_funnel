'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { BoCongThuongBadge } from '@/components/bo-cong-thuong-badge';
import { LanguageMenu } from '@/components/language-menu';
import { LegalConsent } from '@/components/legal-consent';
import { StarRow } from '@/components/value-tour/value-tour-demos';
import { useCopy, useLocale, useSetLocale } from '@/lib/copy/use-copy';
import type { Locale } from '@/lib/copy';

/** Language switch for the first quiz step; it sits in the header where the back button would be. */
export function GoalLanguageMenu() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const router = useRouter();

  const changeLocale = (next: Locale) => {
    setLocale(next);
    router.replace(`/survey/${next}`);
  };

  return <LanguageMenu active={locale} placement="down" onChange={changeLocale} />;
}

/** Rating and customer count, Vietnamese trade notice, and terms shown under the first quiz step. */
export function GoalEntryFooter() {
  const copy = useCopy();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const { rating } = copy.funnel;

  return (
    <footer className="flex shrink-0 flex-col items-center gap-[clamp(6px,0.9vh,10px)] px-1 pt-3">
      <motion.div
        role="img"
        aria-label={`${rating.line}. ${rating.countValue} ${rating.chose}`}
        className="mb-1 flex flex-col items-center text-center"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p aria-hidden="true" className="flex items-center justify-center gap-2">
          <StarRow value={Number(rating.value)} className="text-[0.8125rem]" />
          <span className="text-[0.875rem] font-extrabold leading-tight text-forest">{rating.line}</span>
        </p>
        <p aria-hidden="true" className="mt-0.5 text-[0.8125rem] font-semibold leading-snug text-muted-brand">
          {`${rating.countValue} ${rating.chose}`}
        </p>
      </motion.div>
      {locale === 'vi' ? (
        <BoCongThuongBadge alt={copy.common.bctBadgeAlt} height={52} className="[&_img]:h-[clamp(28px,4.2vh,48px)] [&_img]:w-auto" />
      ) : null}
      <LegalConsent />
    </footer>
  );
}

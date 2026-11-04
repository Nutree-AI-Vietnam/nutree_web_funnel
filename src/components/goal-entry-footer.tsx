'use client';

import { useRouter } from 'next/navigation';
import { BoCongThuongBadge } from '@/components/bo-cong-thuong-badge';
import { LanguageMenu } from '@/components/language-menu';
import { LegalConsent } from '@/components/legal-consent';
import { StoreLaurels, storeRatingsLine } from '@/components/value-tour/value-tour-demos';
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

/** Store ratings and customer count, Vietnamese trade notice, and terms shown under the first quiz step. */
export function GoalEntryFooter() {
  const copy = useCopy();
  const locale = useLocale();
  const rating = copy.funnel.rating;

  return (
    <footer className="flex shrink-0 flex-col items-center gap-3 px-1 pt-3">
      {locale === 'vi' ? (
        <p className="max-w-[18rem] text-center text-[0.82rem] font-semibold leading-snug text-slate-brand">{copy.goal.reassurance}</p>
      ) : (
        <div
          role="img"
          aria-label={`${storeRatingsLine(rating)}. ${rating.countValue} ${rating.chose}`}
          className="w-full"
        >
          <StoreLaurels />
        </div>
      )}
      {locale === 'vi' ? (
        <BoCongThuongBadge alt={copy.common.bctBadgeAlt} height={52} className="[&_img]:h-[clamp(28px,4.2vh,48px)] [&_img]:w-auto" />
      ) : null}
      <LegalConsent />
    </footer>
  );
}

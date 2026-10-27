import Image from 'next/image';
import { copyFor, type Locale } from '@/lib/copy';
import { NutreeLogo } from '@/components/nutree-logo';

type RedemptionEmailGuideCopy = {
  headline: string;
  body: string;
  imageAlt: string;
  imageCaption: string;
  installHint: string;
};

/** The redemption email drawn in English; the only screenshot we have is of the Vietnamese email. */
function EnglishEmailMock() {
  const mail = copyFor('en').funnel.postcheckout;
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border-brand bg-white text-left shadow-[0_18px_40px_rgb(23_69_58_/_0.16)]">
      <div className="flex items-center gap-2.5 border-b border-border-brand/70 bg-[#f6faf7] px-4 py-3">
        <NutreeLogo className="h-8 w-8" />
        <div className="min-w-0">
          <p className="text-[0.72rem] font-bold text-muted-brand">Nutree</p>
          <p className="truncate text-sm font-extrabold text-forest">{mail.emailSubject}</p>
        </div>
      </div>
      <div className="px-4 py-4">
        <p className="text-sm font-semibold leading-relaxed text-slate-brand">{mail.emailBody}</p>
        <span className="mt-4 block rounded-xl bg-[#22a06b] px-4 py-3 text-center text-sm font-extrabold text-white">{mail.emailButton}</span>
      </div>
    </div>
  );
}

export function RedemptionEmailPreview({
  alt,
  caption,
  locale = 'vi',
}: {
  alt: string;
  caption: string;
  locale?: Locale;
}) {
  return (
    <figure className="mx-auto mt-6 max-w-[17.5rem]">
      {locale === 'en' ? (
        <EnglishEmailMock />
      ) : (
        <Image
          src="/images/redemption-email-guide.jpg"
          alt={alt}
          width={487}
          height={1024}
          priority
          className="h-auto w-full rounded-[1.35rem] shadow-[0_18px_40px_rgb(23_69_58_/_0.16)]"
        />
      )}
      <figcaption className="mt-4 text-sm font-semibold leading-relaxed text-slate-brand">{caption}</figcaption>
    </figure>
  );
}

export function RedemptionEmailGuide({ copy, locale = 'vi' }: { copy: RedemptionEmailGuideCopy; locale?: Locale }) {
  return (
    <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
      <p className="text-xs font-extrabold tracking-[0.02em] text-teal-brand">Nutree</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">{copy.headline}</h1>
      <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">{copy.body}</p>
      <RedemptionEmailPreview alt={copy.imageAlt} caption={copy.imageCaption} locale={locale} />
      <p className="mt-4 text-sm font-semibold text-muted-brand">{copy.installHint}</p>
    </section>
  );
}

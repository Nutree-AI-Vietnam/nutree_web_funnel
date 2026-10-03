import Image from 'next/image';

type RedemptionEmailGuideCopy = {
  headline: string;
  body: string;
  imageAlt: string;
  imageCaption: string;
  installHint: string;
};

export function RedemptionEmailPreview({
  alt,
  caption,
}: {
  alt: string;
  caption: string;
}) {
  return (
    <figure className="mx-auto mt-6 max-w-[17.5rem]">
      <Image
        src="/images/redemption-email-guide.jpg"
        alt={alt}
        width={487}
        height={1024}
        priority
        className="h-auto w-full rounded-[1.35rem] shadow-[0_18px_40px_rgb(23_69_58_/_0.16)]"
      />
      <figcaption className="mt-4 text-sm font-semibold leading-relaxed text-slate-brand">{caption}</figcaption>
    </figure>
  );
}

export function RedemptionEmailGuide({ copy }: { copy: RedemptionEmailGuideCopy }) {
  return (
    <section className="w-full max-w-md rounded-[2rem] border border-border-brand bg-white p-7 text-center shadow-[0_24px_70px_rgb(23_69_58_/_0.10)] sm:p-9">
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-brand">Nutree</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-forest">{copy.headline}</h1>
      <p className="mt-4 text-base font-semibold leading-relaxed text-slate-brand">{copy.body}</p>
      <RedemptionEmailPreview alt={copy.imageAlt} caption={copy.imageCaption} />
      <p className="mt-4 text-sm font-semibold text-muted-brand">{copy.installHint}</p>
    </section>
  );
}

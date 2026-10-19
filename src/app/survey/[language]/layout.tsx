import { notFound } from 'next/navigation';
import { isFunnelLocale } from '@/lib/analytics/funnel-locale';
import { metaDatasetForLocale } from '@/lib/analytics/meta-dataset';
import { rootMetadata } from '@/lib/funnel/survey-metadata';
import { RootDocument } from '../../root-document';
import '../../globals.css';

/**
 * Root layout for /survey/vi and /survey/en only, so /, /success, /welcome,
 * /postcheckout and the other pages keep the static Vietnamese document.
 * The pixel id comes from the route segment, using the same English pair as
 * the Conversions API. A full load of /postcheckout or /success is outside
 * this layout and uses the Vietnamese pixel.
 */
export function generateStaticParams() {
  return [{ language: 'vi' }, { language: 'en' }];
}

// The English token is a runtime secret. Render per request so the browser pixel matches it.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ language: string }> }) {
  const { language } = await params;
  if (!isFunnelLocale(language)) return {};
  return rootMetadata(language);
}

export default async function SurveyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ language: string }>;
}) {
  const { language } = await params;
  if (!isFunnelLocale(language)) notFound();
  return (
    <RootDocument locale={language} pixelId={metaDatasetForLocale(language).pixelId}>
      {children}
    </RootDocument>
  );
}

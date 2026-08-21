import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/copy';
import { SurveyPageClient } from './survey-page-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nutree Premium',
  description: 'Your personalized Nutree plan.',
};

export default async function SurveyPage({ params }: { params: Promise<{ language: string }> }) {
  const { language } = await params;
  if (!isLocale(language)) notFound();
  return <SurveyPageClient language={language as Locale} />;
}

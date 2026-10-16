import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/copy';
import { surveyMetadata } from '@/lib/funnel/survey-metadata';
import { SurveyPageClient } from './survey-page-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ language: string }> }): Promise<Metadata> {
  const { language } = await params;
  if (!isLocale(language)) return {};
  return surveyMetadata(language, `/survey/${language}`);
}

export default async function SurveyPage({ params }: { params: Promise<{ language: string }> }) {
  const { language } = await params;
  if (!isLocale(language)) notFound();
  return <SurveyPageClient language={language as Locale} />;
}

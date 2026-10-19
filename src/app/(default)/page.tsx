import { SurveyPageClient } from '@/app/survey/[language]/survey-page-client';
import { surveyMetadata } from '@/lib/funnel/survey-metadata';

export const metadata = surveyMetadata('vi', '/');

/** The shared homepage is the Vietnamese quiz. No redirect, so the link and the page are the same URL. */
export default function HomePage() {
  return <SurveyPageClient language="vi" />;
}

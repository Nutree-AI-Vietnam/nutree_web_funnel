import { redirectToSurvey, type SurveyRedirectProps } from '@/lib/funnel/redirect-to-survey';

/** Keeps old step links inside the single canonical survey route. */
export default async function LegacyQuizStepPage({ searchParams }: SurveyRedirectProps) {
  await redirectToSurvey(searchParams);
}

import { redirectToSurvey, type SurveyRedirectProps } from '@/lib/funnel/redirect-to-survey';

export default async function LegacyPaywallPage({ searchParams }: SurveyRedirectProps) {
  await redirectToSurvey(searchParams);
}

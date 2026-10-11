import { redirectToSurvey, type SurveyRedirectProps } from '@/lib/funnel/redirect-to-survey';

export default async function RootPage({ searchParams }: SurveyRedirectProps) {
  await redirectToSurvey(searchParams);
}

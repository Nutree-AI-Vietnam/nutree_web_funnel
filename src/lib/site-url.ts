const productionSiteUrl = 'https://quiz.nutreeai.com';
const previewSiteUrl = 'https://quiz.preview.nutreeai.com';

export function siteUrlForVercelEnvironment(vercelEnv?: string): string {
  return vercelEnv === 'production' ? productionSiteUrl : previewSiteUrl;
}

export const siteUrl = siteUrlForVercelEnvironment(process.env.VERCEL_ENV);

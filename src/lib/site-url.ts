const productionSiteUrl = 'https://quiz.nutreeai.com';
const previewSiteUrl = 'https://quiz.preview.nutreeai.com';

export function isNutreeClaimSiteUrl(origin: string): boolean {
  return origin === productionSiteUrl || origin === previewSiteUrl;
}

export function siteUrlForVercelEnvironment(vercelEnv?: string): string {
  return vercelEnv === 'production' ? productionSiteUrl : previewSiteUrl;
}

export const siteUrl = siteUrlForVercelEnvironment(process.env.VERCEL_ENV);

/** Keeps browser-origin handoffs on a mobile-associated Nutree claim host. */
export function siteUrlForBrowserOrigin(origin?: string): string {
  return origin && isNutreeClaimSiteUrl(origin) ? origin : siteUrl;
}

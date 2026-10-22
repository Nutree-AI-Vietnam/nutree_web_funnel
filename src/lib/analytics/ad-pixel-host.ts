/**
 * Ad pixels (Meta, TikTok) and their server copies run only on the live quiz
 * host, so Vercel previews, quiz.preview.nutreeai.com and local builds never
 * send test traffic to the live datasets. GA4 and PostHog are not gated.
 */
export const AD_PIXEL_HOST = 'quiz.nutreeai.com';

/** Inline-script guard for snippets that load before React. */
export const AD_PIXEL_HOST_GUARD = `if(location.hostname!=='${AD_PIXEL_HOST}')return;`;

export function isAdPixelHost(hostname: string | undefined = typeof window === 'undefined' ? undefined : window.location?.hostname): boolean {
  return hostname === AD_PIXEL_HOST;
}

/**
 * Server routes forward live events only from the production deployment. The
 * Meta route also checks the request host, so a production deployment's
 * vercel.app URL sends nothing either.
 */
export function isProductionDeployment(vercelEnv = process.env.VERCEL_ENV): boolean {
  return vercelEnv === 'production';
}

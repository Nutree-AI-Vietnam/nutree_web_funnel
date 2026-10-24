const NON_BILLING_COUNTRY_CODES = new Set(['XX', 'T1']);

export function normalizeCountryCode(countryCode: string | null | undefined): string | undefined {
  if (!countryCode) return undefined;

  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return undefined;
  if (NON_BILLING_COUNTRY_CODES.has(normalized)) return undefined;

  return normalized;
}

export function localeFromCountryCode(countryCode: string | null | undefined): 'vi' | 'en' {
  const normalized = normalizeCountryCode(countryCode);
  return normalized ? (normalized === 'VN' ? 'vi' : 'en') : 'vi';
}

/** Whether the browser's language list (an Accept-Language header) includes Vietnamese at any weight above zero. */
export function browserListsVietnamese(acceptLanguage: string | null | undefined): boolean {
  return (acceptLanguage ?? '').split(',').some((entry) => {
    const [tag, ...params] = entry.trim().toLowerCase().split(';');
    if (tag !== 'vi' && !tag.startsWith('vi-')) return false;
    const weight = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
    return weight == null || Number(weight.slice(2)) > 0;
  });
}

/**
 * The funnel language for a visitor. Vietnam keeps Vietnamese, whose prices are in dong, whatever the
 * browser says; the quiz's first screen switches language. Elsewhere, or with no country, a browser that
 * lists Vietnamese gets Vietnamese and every other browser English.
 */
export function localeForVisitor(countryCode: string | null | undefined, acceptLanguage: string | null | undefined): 'vi' | 'en' {
  if (normalizeCountryCode(countryCode) === 'VN') return 'vi';
  return browserListsVietnamese(acceptLanguage) ? 'vi' : 'en';
}

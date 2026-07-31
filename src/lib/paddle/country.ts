const NON_BILLING_COUNTRY_CODES = new Set(['XX', 'T1']);

export function normalizePaddleCountryCode(countryCode: string | null | undefined): string | undefined {
  if (!countryCode) return undefined;

  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return undefined;
  if (NON_BILLING_COUNTRY_CODES.has(normalized)) return undefined;

  return normalized;
}


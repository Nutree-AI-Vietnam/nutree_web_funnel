/**
 * Body units. The quiz stores and sends metric (height_cm, weight_kg, target_weight_kg);
 * what a visitor types and reads back is converted here, at the edges. Imperial labels
 * are English: the Vietnamese funnel stays metric.
 *
 * metric: cm and kg. imperial: feet and inches, pounds. stone: feet and inches, stones and pounds.
 */
export type UnitSystem = 'metric' | 'imperial' | 'stone';
export type Measure = 'height' | 'weight';

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;
const INCHES_PER_FOOT = 12;
const POUNDS_PER_STONE = 14;

/** Visitors from these countries read feet, inches and pounds. */
const IMPERIAL_COUNTRIES = new Set(['US', 'GB']);

export function defaultUnitSystem(locale: string, countryCode: string | undefined): UnitSystem {
  return locale === 'en' && countryCode && IMPERIAL_COUNTRIES.has(countryCode) ? 'imperial' : 'metric';
}

/** The systems a visitor can switch between; stones are an extra choice for the UK. */
export function unitSystemOptions(locale: string, countryCode: string | undefined): UnitSystem[] {
  if (locale !== 'en') return ['metric'];
  if (countryCode === 'GB') return ['imperial', 'stone', 'metric'];
  return defaultUnitSystem(locale, countryCode) === 'imperial' ? ['imperial', 'metric'] : ['metric', 'imperial'];
}

/** The visitor's pick when it is still on offer, else the default for their country. */
export function resolveUnitSystem(
  preferred: UnitSystem | undefined,
  locale: string,
  countryCode: string | undefined,
): UnitSystem {
  return preferred && unitSystemOptions(locale, countryCode).includes(preferred)
    ? preferred
    : defaultUnitSystem(locale, countryCode);
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / INCHES_PER_FOOT), inches: totalInches % INCHES_PER_FOOT };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * INCHES_PER_FOOT + inches) * CM_PER_INCH);
}

export function kgToPounds(kg: number): number {
  return Math.round(kg / KG_PER_POUND);
}

export function poundsToKg(pounds: number): number {
  return round1(pounds * KG_PER_POUND);
}

export function kgToStonePounds(kg: number): { stone: number; pounds: number } {
  const pounds = kgToPounds(kg);
  return { stone: Math.floor(pounds / POUNDS_PER_STONE), pounds: pounds % POUNDS_PER_STONE };
}

export function stonePoundsToKg(stone: number, pounds: number): number {
  return poundsToKg(stone * POUNDS_PER_STONE + pounds);
}

/**
 * The text boxes of a measure: major is cm, ft, kg, lb or st; minor is inches,
 * or the pounds that follow the stones. Metric and plain pounds have no minor box.
 */
export type Boxes = { major: number; minor?: number };

/** Unit labels of the boxes, in the order they are shown. */
export function boxUnits(measure: Measure, system: UnitSystem): string[] {
  if (measure === 'height') return system === 'metric' ? ['cm'] : ['ft', 'in'];
  if (system === 'metric') return ['kg'];
  return system === 'imperial' ? ['lb'] : ['st', 'lb'];
}

/** The minor box must stay below this (11 in after the feet, 13 lb after the stones). */
function minorLimit(measure: Measure, system: UnitSystem): number | undefined {
  if (measure === 'height') return system === 'metric' ? undefined : INCHES_PER_FOOT;
  return system === 'stone' ? POUNDS_PER_STONE : undefined;
}

export function toBoxes(measure: Measure, system: UnitSystem, metric: number): Boxes {
  if (system === 'metric') return { major: metric };
  if (measure === 'height') {
    const { feet, inches } = cmToFeetInches(metric);
    return { major: feet, minor: inches };
  }
  if (system === 'imperial') return { major: kgToPounds(metric) };
  const { stone, pounds } = kgToStonePounds(metric);
  return { major: stone, minor: pounds };
}

/**
 * Metric value of what was typed, or null when a box is empty or bad, or the result falls
 * outside [min, max] (metric). An empty minor box counts as zero: "6 ft" is 6 ft 0 in.
 */
export function boxesToMetric(
  measure: Measure,
  system: UnitSystem,
  major: number | null,
  minor: number | null,
  min: number,
  max: number,
): number | null {
  if (major == null || major < 0) return null;
  const rest = minor ?? 0;
  const limit = minorLimit(measure, system);
  if (rest < 0 || (limit != null && rest >= limit)) return null;
  let metric = major;
  if (system !== 'metric') {
    if (measure === 'height') metric = feetInchesToCm(major, rest);
    else metric = system === 'imperial' ? poundsToKg(major) : stonePoundsToKg(major, rest);
  }
  return metric >= min && metric <= max ? metric : null;
}

function formatFeetInches(totalInches: number): string {
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return inches ? `${feet} ft ${inches} in` : `${feet} ft`;
}

function formatPounds(pounds: number, system: UnitSystem): string {
  if (system !== 'stone') return `${pounds} lb`;
  const stone = Math.floor(pounds / POUNDS_PER_STONE);
  const rest = pounds % POUNDS_PER_STONE;
  return rest ? `${stone} st ${rest} lb` : `${stone} st`;
}

/** Metric values print as they are, so the Vietnamese funnel reads exactly as before. */
export function formatHeight(cm: number, system: UnitSystem): string {
  return system === 'metric' ? `${cm} cm` : formatFeetInches(Math.round(cm / CM_PER_INCH));
}

export function formatWeight(kg: number, system: UnitSystem): string {
  return system === 'metric' ? `${kg} kg` : formatPounds(kgToPounds(kg), system);
}

/** The ends of [min, max] (metric) as the whole units a visitor can type, for error text. */
export function rangeLabels(
  measure: Measure,
  system: UnitSystem,
  min: number,
  max: number,
): { min: string; max: string } {
  if (system === 'metric') {
    const unit = measure === 'height' ? 'cm' : 'kg';
    return { min: `${min} ${unit}`, max: `${max} ${unit}` };
  }
  if (measure === 'height') {
    return {
      min: formatFeetInches(Math.ceil(min / CM_PER_INCH)),
      max: formatFeetInches(Math.floor(max / CM_PER_INCH)),
    };
  }
  return {
    min: formatPounds(Math.ceil(min / KG_PER_POUND), system),
    max: formatPounds(Math.floor(max / KG_PER_POUND), system),
  };
}

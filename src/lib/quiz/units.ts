/**
 * Body units. The quiz stores and sends metric (height_cm, weight_kg, target_weight_kg);
 * what a visitor types and reads back is converted here, at the edges. Imperial labels
 * are English: the Vietnamese funnel stays metric.
 *
 * metric: cm and kg. imperial: feet and inches, pounds.
 */
export type UnitSystem = 'metric' | 'imperial';
export type Measure = 'height' | 'weight';

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;
const INCHES_PER_FOOT = 12;

/** Visitors from these countries read feet, inches and pounds. */
const IMPERIAL_COUNTRIES = new Set(['US', 'GB']);

export function defaultUnitSystem(locale: string, countryCode: string | undefined): UnitSystem {
  return locale === 'en' && countryCode && IMPERIAL_COUNTRIES.has(countryCode) ? 'imperial' : 'metric';
}

/** The systems a visitor can switch between, the default for their country first. */
export function unitSystemOptions(locale: string, countryCode: string | undefined): UnitSystem[] {
  if (locale !== 'en') return ['metric'];
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

/**
 * The boxes of a measure: major is cm, ft, kg or lb; minor is the inches that follow the feet.
 * Only feet and inches have a minor box.
 */
export type Boxes = { major: number; minor?: number };

/** Unit labels of the boxes, in the order they are shown. */
export function boxUnits(measure: Measure, system: UnitSystem): string[] {
  if (measure === 'height') return system === 'metric' ? ['cm'] : ['ft', 'in'];
  return system === 'metric' ? ['kg'] : ['lb'];
}

/** The minor box must stay below this (11 in after the feet); no other box has a limit. */
function minorLimit(measure: Measure, system: UnitSystem): number | undefined {
  return measure === 'height' && system !== 'metric' ? INCHES_PER_FOOT : undefined;
}

export function toBoxes(measure: Measure, system: UnitSystem, metric: number): Boxes {
  if (system === 'metric') return { major: metric };
  if (measure === 'height') {
    const { feet, inches } = cmToFeetInches(metric);
    return { major: feet, minor: inches };
  }
  return { major: kgToPounds(metric) };
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
  if (system !== 'metric') metric = measure === 'height' ? feetInchesToCm(major, rest) : poundsToKg(major);
  return metric >= min && metric <= max ? metric : null;
}

function formatFeetInches(totalInches: number): string {
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return inches ? `${feet} ft ${inches} in` : `${feet} ft`;
}

/** Metric values print as they are, so the Vietnamese funnel reads exactly as before. */
export function formatHeight(cm: number, system: UnitSystem): string {
  return system === 'metric' ? `${cm} cm` : formatFeetInches(Math.round(cm / CM_PER_INCH));
}

export function formatWeight(kg: number, system: UnitSystem): string {
  return system === 'metric' ? `${Math.round(kg * 10) / 10} kg` : `${kgToPounds(kg)} lb`;
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
    min: `${Math.ceil(min / KG_PER_POUND)} lb`,
    max: `${Math.floor(max / KG_PER_POUND)} lb`,
  };
}

/** The wheel stop (total inches for height, pounds for weight) that typed boxes stand for. */
export function boxesToStop(measure: Measure, major: number, minor = 0): number {
  return measure === 'height' ? major * INCHES_PER_FOOT + minor : major;
}

/** The boxes a wheel stop reads as: feet and inches, or pounds. */
export function stopToBoxes(measure: Measure, stop: number): Boxes {
  return measure === 'height'
    ? { major: Math.floor(stop / INCHES_PER_FOOT), minor: stop % INCHES_PER_FOOT }
    : { major: stop };
}

/** The first and last wheel stop whose metric value still lies inside [min, max]. */
export function wheelBounds(measure: Measure, min: number, max: number): { min: number; max: number } {
  const perStop = measure === 'height' ? CM_PER_INCH : KG_PER_POUND;
  const toMetric = (stop: number) => (measure === 'height' ? Math.round(stop * CM_PER_INCH) : poundsToKg(stop));
  let first = Math.ceil(min / perStop);
  let last = Math.floor(max / perStop);
  // Converting back rounds, which can land one stop outside the range.
  if (toMetric(first) < min) first += 1;
  if (toMetric(last) > max) last -= 1;
  return { min: first, max: last };
}

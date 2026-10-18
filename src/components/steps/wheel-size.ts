export type WheelVariant = 'default' | 'hero';

export const WHEEL_ITEM_HEIGHT = 56;
export const WHEEL_HERO_ITEM_HEIGHT = 68;
const MAX_VISIBLE_ITEMS = 5;
const MIN_VISIBLE_ITEMS = 3;
/** Floor on short phones, where three rows would push Continue past the screen. */
const FLOOR_VISIBLE_ITEMS = 2;

/** Smallest wheel the picker shows; its measured frame never shrinks below this. */
export const WHEEL_MIN_HEIGHT = WHEEL_ITEM_HEIGHT * FLOOR_VISIBLE_ITEMS;

/**
 * Fits the wheel into the height its container leaves free. `available` is null
 * until the container has been measured, which renders the full-size wheel.
 * The hero wheel drops to regular rows when it cannot show five large ones.
 */
export function wheelSize(available: number | null, variant: WheelVariant) {
  const roomyHero =
    variant === 'hero' && (available == null || available >= WHEEL_HERO_ITEM_HEIGHT * MAX_VISIBLE_ITEMS);
  const itemHeight = roomyHero ? WHEEL_HERO_ITEM_HEIGHT : WHEEL_ITEM_HEIGHT;
  const full = itemHeight * MAX_VISIBLE_ITEMS;
  const floor = itemHeight * (available != null && available < itemHeight * MIN_VISIBLE_ITEMS ? FLOOR_VISIBLE_ITEMS : MIN_VISIBLE_ITEMS);
  const height =
    available == null ? full : Math.min(full, Math.max(floor, Math.floor(available)));
  return { itemHeight, height, padding: (height - itemHeight) / 2 };
}

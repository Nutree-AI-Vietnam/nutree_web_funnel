/**
 * Rounds to one decimal place the way Python's `round(x, 1)` does, so local
 * targets match the backend digit for digit.
 *
 * A double can only sit exactly halfway between two tenths when it is an odd
 * multiple of 0.25 (e.g. 1252.75); those ties go to the even tenth. Every other
 * value has a single nearest tenth, which `toFixed` finds from the exact binary
 * value.
 */
export function roundHalfEven1(x: number): number {
  if (!Number.isFinite(x)) return x;
  const quadruple = x * 4;
  if (Number.isInteger(quadruple) && quadruple % 2 !== 0) {
    const lower = Math.floor(x * 10);
    return (lower % 2 === 0 ? lower : lower + 1) / 10;
  }
  return Number(x.toFixed(1));
}

const fragmentCapabilityRoutes = new Set(['/open-nutree', '/redeem', '/plan', '/unsubscribe']);

/** Prevents third-party browser code from observing a capability-bearing fragment. */
export function isFragmentCapabilityRoute(pathname: string): boolean {
  return fragmentCapabilityRoutes.has(pathname);
}

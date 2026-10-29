/** Only the implemented Valet route can be resumed after authentication/stay selection.
 * Never accept arbitrary paths, arrays, external URLs or reservation IDs as a destination.
 */
export function valetContinuation(value: unknown): '/valet' | null {
  return value === '/valet' ? '/valet' : null;
}
export function reservationsDestination(value: unknown) {
  const returnTo = valetContinuation(value);
  return returnTo ? { pathname: '/reservations' as const, params: { returnTo } } : '/reservations' as const;
}

/** Returns the first candidate accepted by the feature-specific validity rule. */
export function findFirstAvailableTime({ candidates, isValid }: {
  candidates: readonly string[];
  isValid: (candidate: string) => boolean;
}): string | null {
  return candidates.find(isValid) ?? null;
}

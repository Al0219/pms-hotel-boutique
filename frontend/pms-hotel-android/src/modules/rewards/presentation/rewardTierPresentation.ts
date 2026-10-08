import { type TextStyle, type ViewStyle } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export interface RewardTierPresentation {
  cardStyle: Pick<ViewStyle, 'backgroundColor' | 'borderColor'>;
  eyebrowStyle: Pick<TextStyle, 'color'>;
  levelStyle: Pick<TextStyle, 'color'>;
  summaryTextStyle: Pick<TextStyle, 'color'>;
  testID: 'rewards-tier-silver' | 'rewards-tier-gold' | 'rewards-tier-default';
}

const defaultTierPresentation: RewardTierPresentation = {
  cardStyle: { backgroundColor: tokens.color.inkStrong, borderColor: tokens.color.inkStrong },
  eyebrowStyle: { color: tokens.color.white },
  levelStyle: { color: tokens.color.white },
  summaryTextStyle: { color: tokens.color.white },
  testID: 'rewards-tier-default',
};

const tierPresentations: Record<string, RewardTierPresentation> = {
  silver: {
    cardStyle: { backgroundColor: tokens.color.border, borderColor: tokens.color.brandSoft },
    eyebrowStyle: { color: tokens.color.muted },
    levelStyle: { color: tokens.color.inkStrong },
    summaryTextStyle: { color: tokens.color.ink },
    testID: 'rewards-tier-silver',
  },
  gold: {
    cardStyle: { backgroundColor: tokens.color.pendingSurface, borderColor: tokens.color.pendingText },
    eyebrowStyle: { color: tokens.color.pendingText },
    levelStyle: { color: tokens.color.inkStrong },
    summaryTextStyle: { color: tokens.color.inkStrong },
    testID: 'rewards-tier-gold',
  },
};

export function getTierPresentation(currentLevelText: string): RewardTierPresentation {
  return tierPresentations[currentLevelText.trim().toLocaleLowerCase()] ?? defaultTierPresentation;
}

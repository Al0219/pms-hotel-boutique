import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const guestNavigationStyles = StyleSheet.create({
  shell: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: tokens.space.md,
    height: tokens.layout.guestNavigationHeight,
    paddingHorizontal: tokens.space.guestNavigationInset,
    paddingVertical: tokens.space.sm,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    height: tokens.layout.guestNavigationTabHeight,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  tabActive: {
    backgroundColor: tokens.color.surfaceAccent,
    borderRadius: tokens.radius.guestNavigationTab,
  },
  tabLabel: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.caption,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: tokens.color.brand,
    fontWeight: '600',
  },
});

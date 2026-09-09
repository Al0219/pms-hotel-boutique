import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const foundationStyles = StyleSheet.create({
  screen: {
    backgroundColor: tokens.color.surface,
    flex: 1,
    justifyContent: 'center',
    padding: tokens.layout.screenInset,
  },
  title: {
    color: tokens.color.ink,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.title,
  },
  body: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.body,
    marginTop: tokens.space.sm,
  },
});

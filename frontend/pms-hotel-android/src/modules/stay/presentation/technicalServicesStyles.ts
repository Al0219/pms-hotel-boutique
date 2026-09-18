import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const technicalServicesStyles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1, justifyContent: 'center', padding: tokens.layout.screenInset },
  title: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, marginTop: tokens.space.sm },
  backButton: { alignSelf: 'flex-start', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, marginTop: tokens.space.xl, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm },
  backButtonLabel: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, fontWeight: '600' },
});

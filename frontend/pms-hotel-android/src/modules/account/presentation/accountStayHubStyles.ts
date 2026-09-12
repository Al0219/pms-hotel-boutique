import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const accountStayHubStyles = StyleSheet.create({
  screen: {
    backgroundColor: tokens.color.surface,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: tokens.space.md,
    padding: tokens.layout.screenInset,
    paddingBottom: tokens.space.xxl,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.title,
    fontWeight: '600',
  },
  subtitle: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  stayCard: {
    backgroundColor: tokens.color.inkStrong,
    borderRadius: tokens.radius.card,
    gap: tokens.space.sm,
    padding: tokens.space.xl,
  },
  stayCardEyebrow: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
    fontWeight: '500',
  },
  stayCardTitle: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.sectionTitle,
    fontWeight: '600',
  },
  stayCardBody: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  reference: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.color.brandSoft,
    borderRadius: tokens.radius.chip,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  referenceText: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
    fontWeight: '500',
  },
  stateCard: {
    backgroundColor: tokens.color.surfaceMuted,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: tokens.space.sm,
    padding: tokens.space.lg,
  },
  offlineStateCard: {
    backgroundColor: tokens.color.pendingSurface,
  },
  stateTitle: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.sectionTitle,
    fontWeight: '600',
  },
  stateBody: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  button: {
    alignItems: 'center',
    backgroundColor: tokens.color.brand,
    borderRadius: tokens.radius.control,
    height: tokens.layout.buttonHeight,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.md,
  },
  buttonLabel: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    fontWeight: '600',
  },
  skeleton: {
    backgroundColor: tokens.color.border,
    borderRadius: tokens.radius.control,
    height: tokens.layout.controlHeight,
  },
});

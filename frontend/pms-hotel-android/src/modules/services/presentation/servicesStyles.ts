import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const servicesStyles = StyleSheet.create({
  screen: {
    backgroundColor: tokens.color.surface,
    flex: 1,
  },
  content: {
    gap: tokens.space.md,
    padding: tokens.layout.screenInset,
    paddingBottom: tokens.space.xxl,
  },
  screenContent: {
    flex: 1,
  },
  successContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  title: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.title,
    fontWeight: '600',
  },
  catalog: {
    gap: tokens.space.sm,
  },
  serviceCard: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: tokens.space.xs,
    padding: tokens.space.md,
  },
  serviceCardSelected: {
    backgroundColor: tokens.color.surfaceAccent,
    borderColor: tokens.color.brand,
    borderWidth: 2,
  },
  serviceLabel: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    fontWeight: '600',
  },
  serviceDetail: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  servicePrice: {
    color: tokens.color.ink,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    fontWeight: '600',
  },
  selection: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: tokens.space.xs,
    padding: tokens.space.md,
  },
  selectionHeading: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.caption,
    fontWeight: '600',
  },
  button: {
    alignItems: 'center',
    backgroundColor: tokens.color.brand,
    borderRadius: tokens.radius.control,
    height: tokens.layout.buttonHeight,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.md,
  },
  buttonDisabled: {
    backgroundColor: tokens.color.brandSoft,
  },
  buttonLabel: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    fontWeight: '600',
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
  successStateCard: {
    backgroundColor: tokens.color.surfaceAccent,
    borderColor: tokens.color.brand,
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
  skeleton: {
    backgroundColor: tokens.color.border,
    borderRadius: tokens.radius.control,
    height: tokens.layout.controlHeight,
  },
});

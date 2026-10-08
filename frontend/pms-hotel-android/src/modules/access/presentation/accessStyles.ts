import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const accessStyles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: tokens.color.brand,
    borderRadius: tokens.radius.control,
    height: tokens.layout.buttonHeight,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.md,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonLabel: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    fontWeight: '600',
  },
  field: { gap: tokens.space.xs },
  fieldError: {
    color: '#A73E35',
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  input: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.control,
    borderWidth: 1,
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    height: tokens.layout.controlHeight,
    paddingHorizontal: tokens.space.md,
  },
  inputInvalid: { borderColor: '#A73E35' },
  label: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
    fontWeight: '600',
  },
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: tokens.layout.screenInset },
  stateCard: {
    backgroundColor: tokens.color.surfaceMuted,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: tokens.space.sm,
    padding: tokens.space.lg,
  },
  offlineStateCard: { backgroundColor: tokens.color.pendingSurface },
  stateBody: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  stateTitle: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.sectionTitle,
    fontWeight: '600',
  },
  subtitle: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  title: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.title,
    fontWeight: '600',
  },
  form: { gap: tokens.space.md },
});

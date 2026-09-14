import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const housekeepingStyles = StyleSheet.create({
  backSafeArea: { backgroundColor: tokens.color.surface },
  backHeader: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.xs },
  backButton: { alignItems: 'center', height: tokens.layout.controlHeight + tokens.space.xs, justifyContent: 'center', width: tokens.layout.controlHeight + tokens.space.xs },
  backArrow: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title + tokens.space.xs / 2 },
  selector: { alignItems: 'center', backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, flexDirection: 'row', height: tokens.layout.controlHeight, justifyContent: 'space-between', paddingHorizontal: tokens.space.md },
  chevron: { color: tokens.color.muted, fontSize: tokens.typography.size.sectionTitle },
  modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.35)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: tokens.color.surface, borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card, gap: tokens.space.md, padding: tokens.layout.screenInset },
  typeOption: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, padding: tokens.space.md },
  modalActions: { flexDirection: 'row', gap: tokens.space.sm },
  notes: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.control,
    borderWidth: 1,
    color: tokens.color.ink,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    minHeight: tokens.layout.controlHeight * 2,
    padding: tokens.space.md,
    textAlignVertical: 'top',
  },
});

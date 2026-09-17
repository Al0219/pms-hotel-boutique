import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const sessionServiceRequestStyles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  scroll: { flex: 1 },
  content: { gap: tokens.space.md, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md },
  screenTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title, fontWeight: '700' },
  backButton: { alignItems: 'center', alignSelf: 'flex-start', height: tokens.layout.controlHeight + tokens.space.xs, justifyContent: 'center', width: tokens.layout.controlHeight + tokens.space.xs },
  backButtonLabel: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title + tokens.space.xs / 2 },
  card: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, flexDirection: 'row', gap: tokens.space.sm, padding: tokens.space.md, width: '100%' },
  cardBody: { flex: 1, gap: tokens.space.xs },
  title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  summary: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  status: { alignSelf: 'flex-start', backgroundColor: tokens.color.surfaceAccent, borderRadius: tokens.radius.chip, color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.caption, fontWeight: '600', paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  empty: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  filterList: { flexGrow: 0, marginHorizontal: -tokens.space.lg },
  filterChip: { backgroundColor: tokens.color.surfaceMuted, borderRadius: tokens.radius.chip, marginLeft: tokens.space.lg, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  filterChipSelected: { backgroundColor: tokens.color.surfaceAccent, borderColor: tokens.color.brand, borderWidth: 1 },
  filterLabel: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, fontWeight: '600' },
  swipeRow: { alignSelf: 'stretch', overflow: 'hidden', position: 'relative', width: '100%' },
  removeButton: { alignItems: 'center', backgroundColor: tokens.color.destructive, bottom: 0, justifyContent: 'center', position: 'absolute', right: 0, top: 0 },
  removeLabel: { color: tokens.color.white, fontSize: 30 },
  completeButton: { alignItems: 'center', backgroundColor: tokens.color.surfaceAccent, borderRadius: tokens.radius.control, height: tokens.layout.buttonHeight, justifyContent: 'center', width: tokens.layout.buttonHeight },
  completeButtonDisabled: { opacity: 0.45 },
  completeLabel: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.caption, fontWeight: '600' },
  confirmBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', flex: 1, justifyContent: 'center', padding: tokens.space.lg },
  confirmCard: { backgroundColor: tokens.color.white, borderRadius: tokens.radius.card, gap: tokens.space.md, padding: tokens.space.lg, width: '100%' },
  confirmActions: { flexDirection: 'row', gap: tokens.space.sm, justifyContent: 'flex-end' },
});

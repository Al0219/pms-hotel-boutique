import { StyleSheet } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export const chatStyles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  conversationBody: { flex: 1 },
  contextHeader: { paddingHorizontal: tokens.layout.screenInset, paddingTop: tokens.space.xs },
  context: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  messages: { flex: 1 },
  messagesContent: { gap: tokens.space.sm, padding: tokens.layout.screenInset },
  bubble: { borderRadius: tokens.radius.card, gap: 4, maxWidth: '84%', padding: tokens.space.sm },
  receptionBubble: { alignSelf: 'flex-start', backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderWidth: 1 },
  guestBubble: { alignSelf: 'flex-end', backgroundColor: tokens.color.surfaceAccent },
  bubbleAuthor: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.caption, fontWeight: '600' },
  bubbleText: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  composerSafeArea: { backgroundColor: tokens.color.white },
  composer: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderTopWidth: 1, gap: tokens.space.sm, padding: tokens.space.md },
  composerRow: { alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm },
  input: { borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, color: tokens.color.ink, flex: 1, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, minHeight: tokens.layout.controlHeight, paddingHorizontal: tokens.space.sm },
  sendIconButton: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, height: tokens.layout.buttonHeight, justifyContent: 'center', width: tokens.layout.buttonHeight },
  sendIconButtonDisabled: { backgroundColor: tokens.color.brandSoft },
  sendIcon: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  button: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, height: tokens.layout.buttonHeight, justifyContent: 'center', paddingHorizontal: tokens.space.md },
  buttonDisabled: { backgroundColor: tokens.color.brandSoft },
  buttonLabel: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  stateContent: { flex: 1, justifyContent: 'center', padding: tokens.layout.screenInset },
  stateCard: { backgroundColor: tokens.color.surfaceMuted, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.lg },
  offlineStateCard: { backgroundColor: tokens.color.pendingSurface },
  stateTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  stateBody: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  skeleton: { backgroundColor: tokens.color.border, borderRadius: tokens.radius.control, height: tokens.layout.controlHeight },
});

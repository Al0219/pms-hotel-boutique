import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export function ConfirmationModal({ body, confirmLabel, destructive = false, onCancel, onConfirm, testID, title, visible }: {
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  testID: string;
  title: string;
  visible: boolean;
}) {
  return <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
    <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card} testID={testID}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text>
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel} testID={`${testID}-cancel`}><Text style={styles.cancelLabel}>Cancelar</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.confirm, destructive && styles.destructive]} testID={`${testID}-confirm`}><Text style={styles.confirmLabel}>{confirmLabel}</Text></Pressable></View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.35)', flex: 1, justifyContent: 'center', padding: tokens.space.lg },
  card: { backgroundColor: tokens.color.white, borderRadius: tokens.radius.card, gap: tokens.space.md, padding: tokens.space.lg, width: '100%' },
  title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  cancel: { alignItems: 'center', borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1, flex: 1, height: tokens.layout.buttonHeight, justifyContent: 'center' },
  cancelLabel: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  confirm: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, flex: 1, height: tokens.layout.buttonHeight, justifyContent: 'center' },
  destructive: { backgroundColor: tokens.color.destructive },
  confirmLabel: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
});

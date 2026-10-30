import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {SymbolView} from 'expo-symbols';
import {type GuestFeatureIcon} from '@/modules/navigation/guestFeatureIcons';
import { tokens } from '@/shared/theme/tokens';

export function ConfirmationModal({ busy=false, icon, body, confirmLabel, destructive = false, onCancel, onConfirm, showCancel = true, testID, title, visible }: {
  busy?:boolean;
  icon?:GuestFeatureIcon;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  showCancel?: boolean;
  testID: string;
  title: string;
  visible: boolean;
}) {
  return <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
    <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card} testID={testID}>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{title}</Text>{showCancel ? null : <Pressable accessibilityLabel="Cerrar confirmación" accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} onPress={onCancel} style={styles.close} testID={`${testID}-close`}><Text style={styles.closeLabel}>×</Text></Pressable>}</View><Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>{showCancel ? <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} onPress={onCancel} style={styles.cancel} testID={`${testID}-cancel`}><Text style={styles.cancelLabel}>Cancelar</Text></Pressable> : null}
        <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} onPress={onConfirm} style={[styles.confirm, destructive && styles.destructive]} testID={`${testID}-confirm`}>{icon?<SymbolView name={icon} size={18} tintColor={tokens.color.white} accessibilityElementsHidden/>:null}<Text style={styles.confirmLabel}>{confirmLabel}</Text></Pressable></View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.35)', flex: 1, justifyContent: 'center', padding: tokens.space.lg },
  card: { backgroundColor: tokens.color.white, borderRadius: tokens.radius.card, gap: tokens.space.md, padding: tokens.space.lg, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  close: { alignItems: 'center', height: tokens.layout.buttonHeight, justifyContent: 'center', width: tokens.layout.buttonHeight },
  closeLabel: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title },
  title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  cancel: { alignItems: 'center', borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1, flex: 1, minHeight: tokens.layout.buttonHeight, paddingHorizontal:16,paddingVertical:12, justifyContent: 'center' },
  cancelLabel: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  confirm: { flexDirection:'row',gap:8,alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, flex: 1, minHeight: tokens.layout.buttonHeight, paddingHorizontal:16,paddingVertical:12, justifyContent: 'center' },
  destructive: { backgroundColor: tokens.color.destructive },
  confirmLabel: { flexShrink:1,textAlign:'center', color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
});

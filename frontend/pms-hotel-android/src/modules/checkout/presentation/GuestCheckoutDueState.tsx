import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

/** Presentation-only state shared by Guest features once checkout becomes due. */
export function GuestCheckoutDueState({ actionTestID, testID }: { actionTestID: string; testID: string }) {
  return <View accessibilityLiveRegion="polite" style={styles.card} testID={testID}>
    <Text accessibilityRole="header" style={styles.title}>Hora de salida alcanzada</Text>
    <Text style={styles.body}>Finaliza el check-out para cerrar tu estancia.</Text>
    <Pressable accessibilityRole="button" onPress={() => router.push('/account/checkout')} style={styles.action} testID={actionTestID}><Text style={styles.actionLabel}>Realizar Check-out</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.color.surfaceMuted, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.lg },
  title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  action: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, minHeight: tokens.layout.buttonHeight, justifyContent: 'center', paddingHorizontal: tokens.space.md },
  actionLabel: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
});

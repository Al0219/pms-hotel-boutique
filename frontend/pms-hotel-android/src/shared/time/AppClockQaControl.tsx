import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { appClockModes, type AppClockMode, useAppClock } from '@/shared/time/AppClock';
import { TimeWheelPicker } from '@/shared/components';
import { tokens } from '@/shared/theme/tokens';

const labels: Record<AppClockMode, string> = {
  SYSTEM: 'Sistema',
  BEFORE_CHECKIN: 'Antes del check-in',
  CHECKIN_DAY: 'Día de check-in',
  IN_STAY: 'Durante la estancia',
  CHECKOUT_DAY: 'Día de check-out',
  CHECKOUT_CUTOFF: 'Corte de check-out',
  AFTER_STAY: 'Después de la estancia',
  CUSTOM: 'Personalizado',
};

function mergeDate(current: Date, selected: Date): Date {
  return new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), current.getHours(), current.getMinutes(), 0, 0);
}

export function formatAppClockDate(value: Date): string {
  return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
}

export function formatAppClockTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

/** Floating manual-QA control. The root renders it only in __DEV__ builds. */
export function AppClockQaControl() {
  const appClock = useAppClock();
  const [visible, setVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  if (!__DEV__) return null;

  const displayedDate = appClock.mode === 'CUSTOM' ? appClock.customDate : appClock.getNow();
  const onDatePickerDismiss = () => {
    setDatePickerVisible(false);
  };
  const onDatePickerValueChange = (_event: unknown, selected: Date) => {
    setDatePickerVisible(false);
    appClock.setCustomDate(mergeDate(displayedDate, selected));
  };

  return <>
    <Pressable accessibilityLabel="Abrir reloj de QA" accessibilityRole="button" onPress={() => setVisible(true)} style={styles.trigger} testID="app-clock-qa-open">
      <Text style={styles.triggerText}>QA · {labels[appClock.mode]}</Text>
    </Pressable>
    <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.panel} testID="app-clock-qa-control">
          <Text accessibilityRole="header" style={styles.title}>Reloj de QA</Text>
          <Text style={styles.current}>{appClock.getNow().toLocaleString('es-GT')}</Text>
          <ScrollView contentContainerStyle={styles.options}>
            {appClockModes.map((mode) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: appClock.mode === mode }} key={mode} onPress={() => appClock.setMode(mode)} style={[styles.option, appClock.mode === mode && styles.optionSelected]} testID={`app-clock-mode-${mode}`}>
              <Text style={styles.optionText}>{labels[mode]}</Text>
            </Pressable>)}
          </ScrollView>
          <View style={styles.customRow}>
            <Pressable accessibilityLabel={`Fecha: ${formatAppClockDate(displayedDate)}`} accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={styles.customButton} testID="app-clock-custom-date"><Text style={styles.optionText}>{formatAppClockDate(displayedDate)}</Text></Pressable>
            <Pressable accessibilityLabel={`Hora: ${formatAppClockTime(displayedDate)}`} accessibilityRole="button" onPress={() => setTimePickerVisible(true)} style={styles.customButton} testID="app-clock-custom-time"><Text style={styles.optionText}>{formatAppClockTime(displayedDate)}</Text></Pressable>
          </View>
          {datePickerVisible ? <DateTimePicker mode="date" onDismiss={onDatePickerDismiss} onValueChange={onDatePickerValueChange} testID="app-clock-date-picker" value={displayedDate} /> : null}
          <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.close} testID="app-clock-qa-close"><Text style={styles.closeText}>Cerrar</Text></Pressable>
        </View>
      </View>
    </Modal>
    <TimeWheelPicker mode="time" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => {
      const [hours, minutes] = value.split(':').map(Number);
      const selected = new Date(displayedDate);
      selected.setHours(hours, minutes, 0, 0);
      appClock.setCustomDate(selected);
      setTimePickerVisible(false);
    }} testID="app-clock-time-picker" title="Elegir hora" value={formatAppClockTime(displayedDate)} visible={timePickerVisible} />
  </>;
}

const styles = StyleSheet.create({
  trigger: { position: 'absolute', right: tokens.space.sm, bottom: tokens.layout.guestNavigationHeight + tokens.space.xl, backgroundColor: tokens.color.inkStrong, borderRadius: tokens.radius.control, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs, zIndex: 1000 },
  triggerText: { color: tokens.color.white, fontSize: tokens.typography.size.caption },
  backdrop: { flex: 1, justifyContent: 'center', padding: tokens.space.lg, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: { maxHeight: '90%', borderRadius: tokens.radius.card, backgroundColor: tokens.color.surface, padding: tokens.space.lg },
  title: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.sectionTitle, fontWeight: '700' },
  current: { color: tokens.color.muted, marginBottom: tokens.space.md, marginTop: tokens.space.xs },
  options: { gap: tokens.space.xs },
  option: { borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, padding: tokens.space.sm },
  optionSelected: { backgroundColor: tokens.color.surfaceAccent, borderColor: tokens.color.brand },
  optionText: { color: tokens.color.ink },
  customRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  customButton: { flex: 1, alignItems: 'center', borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1, padding: tokens.space.sm },
  close: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, marginTop: tokens.space.md, padding: tokens.space.sm },
  closeText: { color: tokens.color.white, fontWeight: '700' },
});

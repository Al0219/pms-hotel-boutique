import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { guestFeatureIcons } from '@/modules/navigation/guestFeatureIcons';
import { formatServiceDate, parseServiceDate } from '@/modules/service-requests';
import { tokens } from '@/shared/theme/tokens';

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const monthText = new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' });
const fullDateText = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (left: Date, right: Date) => formatServiceDate(left) === formatServiceDate(right);
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonth = (date: Date, change: number) => new Date(date.getFullYear(), date.getMonth() + change, 1);
const monthDays = (month: Date) => { const first = monthStart(month); const offset = (first.getDay() + 6) % 7; return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index - offset + 1)); };

export function ServiceDatePicker({ maximumDate, minimumDate, isDateEnabled, onCancel, onConfirm, testID, value, visible }: { maximumDate?: Date; minimumDate: Date; isDateEnabled?: (date: Date) => boolean; onCancel: () => void; onConfirm: (serviceDate: string) => void; testID: string; value: string; visible: boolean; }) {
  const selected = parseServiceDate(value) ?? startOfDay(minimumDate);
  const [draft, setDraft] = useState(selected);
  const [month, setMonth] = useState(monthStart(selected));
  const minimum = startOfDay(minimumDate);
  const maximum = maximumDate ? startOfDay(maximumDate) : null;
  const enabled = (date: Date) => { const local = startOfDay(date); return local >= minimum && (maximum === null || local <= maximum) && (isDateEnabled?.(local) ?? true); };
  const allowsMonth = (candidate: Date) => monthDays(candidate).some((date) => date.getMonth() === candidate.getMonth() && enabled(date));
  const wasVisible = useRef(visible);
  useEffect(() => {
    const reopened = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!reopened) return;
    const confirmed = parseServiceDate(value) ?? startOfDay(minimumDate);
    const timer = setTimeout(() => { setDraft(confirmed); setMonth(monthStart(confirmed)); }, 0);
    return () => clearTimeout(timer);
  }, [minimumDate, value, visible]);
  const days = useMemo(() => monthDays(month), [month]);
  if (!visible) return null;
  const previous = addMonth(month, -1); const next = addMonth(month, 1);
  return <Modal animationType="slide" onRequestClose={onCancel} transparent visible><Pressable onPress={onCancel} style={styles.backdrop} testID={testID + '-backdrop'}><SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.safeArea}><Pressable accessibilityViewIsModal onPress={(event) => event.stopPropagation()} style={styles.sheet} testID={testID}>
    <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Elegir fecha</Text><Pressable accessibilityLabel="Cerrar calendario" accessibilityRole="button" onPress={onCancel} style={styles.iconButton} testID={testID + '-close'}><Text style={styles.close}>×</Text></Pressable></View>
    <View style={styles.monthRow}><Pressable accessibilityLabel="Mes anterior" accessibilityRole="button" accessibilityState={{ disabled: !allowsMonth(previous) }} disabled={!allowsMonth(previous)} onPress={() => setMonth(previous)} style={styles.iconButton} testID={testID + '-previous-month'}><SymbolView accessibilityElementsHidden name={guestFeatureIcons.chevronLeft} size={20} tintColor={tokens.color.inkStrong} /></Pressable><Text style={styles.month}>{monthText.format(month)}</Text><Pressable accessibilityLabel="Mes siguiente" accessibilityRole="button" accessibilityState={{ disabled: !allowsMonth(next) }} disabled={!allowsMonth(next)} onPress={() => setMonth(next)} style={styles.iconButton} testID={testID + '-next-month'}><SymbolView accessibilityElementsHidden name={guestFeatureIcons.chevronRight} size={20} tintColor={tokens.color.inkStrong} /></Pressable></View>
    <View style={styles.weekRow}>{weekdays.map((weekday) => <Text key={weekday} style={styles.weekday}>{weekday}</Text>)}</View><View style={styles.days}>{days.map((date) => { const outside = date.getMonth() !== month.getMonth(); const available = !outside && enabled(date); const isSelected = sameDay(date, draft); const isToday = sameDay(date, new Date()); return <Pressable accessibilityLabel={fullDateText.format(date)} accessibilityRole="button" accessibilityState={{ disabled: !available, selected: isSelected }} disabled={!available} key={formatServiceDate(date)} onPress={() => setDraft(date)} style={[styles.day, isToday && !isSelected && styles.today, isSelected && styles.selected]} testID={testID + '-day-' + formatServiceDate(date)}><Text style={[styles.dayText, (!available || outside) && styles.disabled, isSelected && styles.selectedText]}>{date.getDate()}</Text></Pressable>; })}</View>
    <View style={styles.actions}><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel} testID={testID + '-cancel'}><Text style={styles.cancelText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onConfirm(formatServiceDate(draft))} style={styles.confirm} testID={testID + '-confirm'}><Text style={styles.confirmText}>Aceptar</Text></Pressable></View>
  </Pressable></SafeAreaView></Pressable></Modal>;
}

export function formatGuestDate(value: string): string { const date = parseServiceDate(value); return date ? String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear() : value; }
const styles = StyleSheet.create({ backdrop: { backgroundColor: 'rgba(0,0,0,.35)', flex: 1, justifyContent: 'flex-end' }, safeArea: { justifyContent: 'flex-end' }, sheet: { backgroundColor: tokens.color.surface, borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card, padding: tokens.layout.screenInset }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' }, iconButton: { alignItems: 'center', height: tokens.layout.controlHeight, justifyContent: 'center', width: tokens.layout.controlHeight }, close: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.title }, monthRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, month: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600', textTransform: 'capitalize' }, weekRow: { flexDirection: 'row' }, weekday: { color: tokens.color.muted, flex: 1, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.caption, textAlign: 'center' }, days: { flexDirection: 'row', flexWrap: 'wrap' }, day: { alignItems: 'center', height: tokens.layout.controlHeight, justifyContent: 'center', width: '14.2857%' }, dayText: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium }, disabled: { color: tokens.color.border }, today: { borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1 }, selected: { backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control }, selectedText: { color: tokens.color.white, fontWeight: '600' }, actions: { flexDirection: 'row', gap: tokens.space.sm, justifyContent: 'flex-end', marginTop: tokens.space.md }, cancel: { alignItems: 'center', justifyContent: 'center', minHeight: tokens.layout.buttonHeight, paddingHorizontal: tokens.space.md }, cancelText: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' }, confirm: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, justifyContent: 'center', minHeight: tokens.layout.buttonHeight, paddingHorizontal: tokens.space.lg }, confirmText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' } });

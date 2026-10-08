/* The local wheel renderer captures the picker draft; extracting it would duplicate that state. */
/* eslint-disable react-hooks/static-components */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

export interface TimeSlotOption { value: string; label: string; }
type Common = { disabled?: boolean; onCancel: () => void; onConfirm: (value: string) => void; testID: string; title: string; value: string; visible: boolean; isValueDisabled?: (value: string) => boolean; availabilityHint?: { label: string; accessibilityLabel: string } };
export type TimeWheelPickerProps = (Common & { mode: 'slots'; options: readonly TimeSlotOption[] }) | (Common & { mode: 'time' });
const height = tokens.layout.controlHeight, copies = 3, center = 1;
type Repeated = { copy: number; value: number };
const pad = (value: number) => String(value).padStart(2, '0');
const valid = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '00:00';
/** Normalizes a position in the finite repeated wheel. */
export const normalizeCircularIndex = (index: number, length: number) => ((index % length) + length) % length;
export const createCircularTimeValues = (length: number): readonly Repeated[] => Array.from({ length: length * copies }, (_, index) => ({ copy: Math.floor(index / length), value: normalizeCircularIndex(index, length) }));
const hours = createCircularTimeValues(24), minutes = createCircularTimeValues(60);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained only while preserving the existing slots implementation during this focused repair.
function LegacyTimeWheelPicker(props: TimeWheelPickerProps) {
  const [override, setOverride] = useState<string | null>(null);
  const slots = useRef<FlatList<TimeSlotOption>>(null), hourList = useRef<FlatList<Repeated>>(null), minuteList = useRef<FlatList<Repeated>>(null);
  const requested = override ?? (props.mode === 'time' ? valid(props.value) : props.value);
  const firstEnabled = props.mode === 'slots' ? props.options.find((item) => !props.disabled && !props.isValueDisabled?.(item.value))?.value : undefined;
  const draft = props.mode === 'slots' && props.isValueDisabled?.(requested) ? firstEnabled ?? requested : requested;
  const [hour, minute] = valid(draft).split(':');
  const choose = (h: string, m: string) => setOverride(`${h}:${m}`);
  const disabled = Boolean(props.disabled || props.isValueDisabled?.(draft));
  const recenter = (list: React.RefObject<FlatList<Repeated> | null>, index: number, length: number) => { const normalized = normalizeCircularIndex(index, length); if (index < length || index >= length * 2) list.current?.scrollToOffset({ animated: false, offset: (center * length + normalized) * height }); return normalized; };
  const show = () => { if (props.mode === 'slots') { const index = Math.max(0, props.options.findIndex((item) => item.value === draft)); slots.current?.scrollToOffset({ animated: false, offset: index * height }); } else { hourList.current?.scrollToOffset({ animated: false, offset: (center * 24 + Number(hour)) * height }); minuteList.current?.scrollToOffset({ animated: false, offset: (center * 60 + Number(minute)) * height }); } };
  const cancel = () => { setOverride(null); props.onCancel(); };
  const Wheel = ({ data, list, length, selected, onSelect, suffix }: { data: readonly Repeated[]; list: React.RefObject<FlatList<Repeated> | null>; length: number; selected: string; onSelect: (value: string) => void; suffix: 'hour' | 'minute' }) => <FlatList contentContainerStyle={styles.timeContent} data={data} decelerationRate="fast" disableIntervalMomentum getItemLayout={(_, index) => ({ index, length: height, offset: index * height })} initialNumToRender={data.length} keyExtractor={(item, index) => `${item.copy}-${item.value}-${index}`} onMomentumScrollEnd={(event) => onSelect(pad(recenter(list, Math.round(event.nativeEvent.contentOffset.y / height), length)))} ref={list} renderItem={({ item }) => { const value = pad(item.value); const selectedHere = item.copy === center && selected === value; const valueDisabled = Boolean(props.disabled || props.isValueDisabled?.(suffix === 'hour' ? `${value}:${minute}` : `${hour}:${value}`)); return <Pressable accessibilityRole="radio" accessibilityState={{ disabled: valueDisabled, selected: selectedHere }} disabled={props.disabled} onPress={() => onSelect(value)} style={[styles.option, selectedHere && styles.selected]} testID={item.copy === center ? `${props.testID}-${suffix}-${value}` : `${props.testID}-${suffix}-${value}-copy-${item.copy}`}><Text style={[styles.optionText, valueDisabled && styles.disabled]}>{value}</Text></Pressable>; }} showsVerticalScrollIndicator={false} snapToInterval={height} style={styles.timeList} testID={`${props.testID}-${suffix}s`} />;
  return <Modal animationType="slide" onRequestClose={cancel} onShow={show} transparent visible={props.visible}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.sheet} testID={props.testID}><View style={styles.titleRow}><Text accessibilityRole="header" style={styles.title}>{props.title}</Text>{props.availabilityHint ? <View accessibilityLabel={props.availabilityHint.accessibilityLabel} style={styles.hint} testID={`${props.testID}-availability-hint`}><Text style={styles.hintText}>{props.availabilityHint.label}</Text></View> : null}</View>{props.mode === 'slots' ? <FlatList contentContainerStyle={styles.slotContent} data={props.options} getItemLayout={(_, index) => ({ index, length: height, offset: index * height })} keyExtractor={(item) => item.value} onMomentumScrollEnd={(event) => { const item = props.options[Math.max(0, Math.min(props.options.length - 1, Math.round(event.nativeEvent.contentOffset.y / height)))]; if (item && !props.disabled && !props.isValueDisabled?.(item.value)) setOverride(item.value); }} ref={slots} renderItem={({ item }) => { const valueDisabled = Boolean(props.disabled || props.isValueDisabled?.(item.value)); return <Pressable accessibilityRole="radio" accessibilityState={{ disabled: valueDisabled, selected: draft === item.value }} disabled={valueDisabled} onPress={() => setOverride(item.value)} style={[styles.option, draft === item.value && styles.selected]} testID={`${props.testID}-option-${item.value}`}><Text style={[styles.optionText, valueDisabled && styles.disabled]}>{item.label}</Text></Pressable>; }} snapToInterval={height} style={styles.slotList} testID={`${props.testID}-options`} /> : <View accessibilityLabel="Selector de hora" style={styles.wheel} testID={`${props.testID}-wheel`}><Wheel data={hours} length={24} list={hourList} onSelect={(value) => choose(value, minute)} selected={hour} suffix="hour" /><Text style={styles.separator}>:</Text><Wheel data={minutes} length={60} list={minuteList} onSelect={(value) => choose(hour, value)} selected={minute} suffix="minute" /></View>}<View style={styles.actions}><Pressable accessibilityRole="button" onPress={cancel} style={styles.secondary} testID={`${props.testID}-cancel`}><Text style={styles.secondaryText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => { if (!disabled) { setOverride(null); props.onConfirm(draft); } }} style={[styles.primary, disabled && styles.primaryDisabled]} testID={`${props.testID}-confirm`}><Text style={styles.primaryText}>Aceptar</Text></Pressable></View></View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { backgroundColor: 'rgba(0,0,0,.35)', flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: tokens.color.surface, borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card, gap: tokens.space.md, padding: tokens.layout.screenInset }, titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' }, hint: { backgroundColor: tokens.color.surfaceMuted, borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs }, hintText: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.caption }, wheel: { alignItems: 'center', flexDirection: 'row', height: height * 3, justifyContent: 'center' }, timeList: { height: height * 3, width: tokens.layout.buttonHeight }, timeContent: { paddingVertical: height }, slotList: { height: height * 3 }, slotContent: { paddingVertical: height }, option: { alignItems: 'center', height, justifyContent: 'center' }, selected: { backgroundColor: tokens.color.surfaceAccent }, optionText: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label }, disabled: { color: tokens.color.muted, textDecorationLine: 'line-through' }, separator: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.sectionTitle }, actions: { flexDirection: 'row', gap: tokens.space.sm }, primary: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, flex: 1, height: tokens.layout.buttonHeight, justifyContent: 'center' }, secondary: { alignItems: 'center', borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1, flex: 1, height: tokens.layout.buttonHeight, justifyContent: 'center' }, primaryText: { color: tokens.color.white, fontFamily: tokens.typography.family }, secondaryText: { color: tokens.color.brand, fontFamily: tokens.typography.family }, primaryDisabled: { backgroundColor: tokens.color.brandSoft } });

interface StableWheelProps {
  data: readonly Repeated[];
  disabled?: boolean;
  isValueDisabled?: (value: string) => boolean;
  length: number;
  onSelect: (value: string) => void;
  otherValue: string;
  selected: string;
  suffix: 'hour' | 'minute';
  testID: string;
}

/** Stable native list: pending logical time changes do not remount the wheel. */
function StableWheel({ data, disabled, isValueDisabled, length, onSelect, otherValue, selected, suffix, testID }: StableWheelProps) {
  const list = useRef<FlatList<Repeated>>(null);
  const programmedRecenterIndex = useRef<number | null>(null);
  const onMomentumScrollEnd = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const visualIndex = Math.round(event.nativeEvent.contentOffset.y / height);
    const programmedIndex = programmedRecenterIndex.current;
    if (programmedIndex !== null) {
      programmedRecenterIndex.current = null;
      if (visualIndex === programmedIndex) return;
    }
    const logicalValue = normalizeCircularIndex(visualIndex, length);
    onSelect(pad(logicalValue));
    if (visualIndex < length || visualIndex >= length * 2) {
      const targetIndex = center * length + logicalValue;
      programmedRecenterIndex.current = targetIndex;
      list.current?.scrollToOffset({ animated: false, offset: targetIndex * height });
    }
  };
  return <FlatList contentContainerStyle={styles.timeContent} data={data} decelerationRate="fast" disableIntervalMomentum getItemLayout={(_, index) => ({ index, length: height, offset: index * height })} initialNumToRender={data.length} keyExtractor={(item, index) => `${item.copy}-${item.value}-${index}`} onMomentumScrollEnd={onMomentumScrollEnd} ref={list} renderItem={({ item }) => { const value = pad(item.value); const valueDisabled = Boolean(disabled || isValueDisabled?.(suffix === 'hour' ? `${value}:${otherValue}` : `${otherValue}:${value}`)); return <Pressable accessibilityRole="radio" accessibilityState={{ disabled: valueDisabled, selected: item.copy === center && selected === value }} disabled={disabled} onPress={() => onSelect(value)} style={[styles.option, item.copy === center && selected === value && styles.selected]} testID={item.copy === center ? `${testID}-${suffix}-${value}` : `${testID}-${suffix}-${value}-copy-${item.copy}`}><Text style={[styles.optionText, valueDisabled && styles.disabled]}>{value}</Text></Pressable>; }} showsVerticalScrollIndicator={false} snapToInterval={height} style={styles.timeList} testID={`${testID}-${suffix}s`} />;
}

export function TimeWheelPicker(props: TimeWheelPickerProps) {
  const externalTime = valid(props.value);
  const [timeDraft, setTimeDraft] = useState(externalTime);
  const [slotOverride, setSlotOverride] = useState<string | null>(null);
  const slots = useRef<FlatList<TimeSlotOption>>(null);
  const hourList = useRef<FlatList<Repeated>>(null);
  const minuteList = useRef<FlatList<Repeated>>(null);
  const previousExternalTime = useRef(externalTime);
  const wasVisible = useRef(false);
  const scrollTimeTo = useCallback((value: string) => {
    const [hour, minute] = valid(value).split(':').map(Number);
    hourList.current?.scrollToOffset({ animated: false, offset: (center * 24 + hour) * height });
    minuteList.current?.scrollToOffset({ animated: false, offset: (center * 60 + minute) * height });
  }, []);
  useEffect(() => {
    if (props.mode !== 'time') return;
    const opening = props.visible && !wasVisible.current;
    const changedExternally = externalTime !== previousExternalTime.current;
    if (props.visible && (opening || changedExternally)) {
      setTimeDraft(externalTime);
      scrollTimeTo(externalTime);
    }
    previousExternalTime.current = externalTime;
    wasVisible.current = props.visible;
  }, [externalTime, props.mode, props.visible, scrollTimeTo]);
  const requested = props.mode === 'time' ? timeDraft : slotOverride ?? props.value;
  const firstEnabled = props.mode === 'slots' ? props.options.find((item) => !props.disabled && !props.isValueDisabled?.(item.value))?.value : undefined;
  const draft = props.mode === 'slots' && props.isValueDisabled?.(requested) ? firstEnabled ?? requested : requested;
  const [hour, minute] = valid(timeDraft).split(':');
  const disabled = Boolean(props.disabled || props.isValueDisabled?.(draft));
  const onShow = () => {
    if (props.mode === 'slots') {
      const index = Math.max(0, props.options.findIndex((item) => item.value === draft));
      slots.current?.scrollToOffset({ animated: false, offset: index * height });
    } else {
      setTimeDraft(externalTime);
      scrollTimeTo(externalTime);
    }
  };
  const cancel = () => {
    setSlotOverride(null);
    if (props.mode === 'time') setTimeDraft(externalTime);
    props.onCancel();
  };
  return <Modal animationType="slide" onRequestClose={cancel} onShow={onShow} transparent visible={props.visible}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.sheet} testID={props.testID}><View style={styles.titleRow}><Text accessibilityRole="header" style={styles.title}>{props.title}</Text>{props.availabilityHint ? <View accessibilityLabel={props.availabilityHint.accessibilityLabel} style={styles.hint} testID={`${props.testID}-availability-hint`}><Text style={styles.hintText}>{props.availabilityHint.label}</Text></View> : null}</View>{props.mode === 'slots' ? <FlatList contentContainerStyle={styles.slotContent} data={props.options} getItemLayout={(_, index) => ({ index, length: height, offset: index * height })} keyExtractor={(item) => item.value} onMomentumScrollEnd={(event) => { const item = props.options[Math.max(0, Math.min(props.options.length - 1, Math.round(event.nativeEvent.contentOffset.y / height)))]; if (item && !props.disabled && !props.isValueDisabled?.(item.value)) setSlotOverride(item.value); }} ref={slots} renderItem={({ item }) => { const valueDisabled = Boolean(props.disabled || props.isValueDisabled?.(item.value)); return <Pressable accessibilityRole="radio" accessibilityState={{ disabled: valueDisabled, selected: draft === item.value }} disabled={valueDisabled} onPress={() => setSlotOverride(item.value)} style={[styles.option, draft === item.value && styles.selected]} testID={`${props.testID}-option-${item.value}`}><Text style={[styles.optionText, valueDisabled && styles.disabled]}>{item.label}</Text></Pressable>; }} snapToInterval={height} style={styles.slotList} testID={`${props.testID}-options`} /> : <View accessibilityLabel="Selector de hora" style={styles.wheel} testID={`${props.testID}-wheel`}><StableWheel data={hours} disabled={props.disabled} isValueDisabled={props.isValueDisabled} length={24} onSelect={(value) => setTimeDraft((current) => `${value}:${valid(current).split(':')[1]}`)} otherValue={minute} selected={hour} suffix="hour" testID={props.testID} /><Text style={styles.separator}>:</Text><StableWheel data={minutes} disabled={props.disabled} isValueDisabled={props.isValueDisabled} length={60} onSelect={(value) => setTimeDraft((current) => `${valid(current).split(':')[0]}:${value}`)} otherValue={hour} selected={minute} suffix="minute" testID={props.testID} /></View>}<View style={styles.actions}><Pressable accessibilityRole="button" onPress={cancel} style={styles.secondary} testID={`${props.testID}-cancel`}><Text style={styles.secondaryText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => { if (!disabled) { setSlotOverride(null); props.onConfirm(draft); } }} style={[styles.primary, disabled && styles.primaryDisabled]} testID={`${props.testID}-confirm`}><Text style={styles.primaryText}>Aceptar</Text></Pressable></View></View></View></Modal>;
}

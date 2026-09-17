import { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export interface TimeSlotOption {
  value: string;
  label: string;
}

type CommonProps = {
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void;
  testID: string;
  title: string;
  value: string;
  visible: boolean;
  isValueDisabled?: (value: string) => boolean;
};

export type TimeWheelPickerProps =
  | (CommonProps & { mode: 'slots'; options: readonly TimeSlotOption[] })
  | (CommonProps & { mode: 'time' });

const slotItemHeight = tokens.layout.controlHeight;

function normalizeTime(value: string): string {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '00:00';
}

function optionText(value: number): string {
  return String(value).padStart(2, '0');
}

/** Shared modal shell. Consumers own the rules governing available values. */
export function TimeWheelPicker(props: TimeWheelPickerProps) {
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const slotList = useRef<FlatList<TimeSlotOption>>(null);
  const hourList = useRef<FlatList<number>>(null);
  const minuteList = useRef<FlatList<number>>(null);
  const requestedDraft = draftOverride ?? (props.mode === 'time' ? normalizeTime(props.value) : props.value);
  const firstEnabledSlot = props.mode === 'slots'
    ? props.options.find((option) => !props.disabled && !props.isValueDisabled?.(option.value))?.value
    : undefined;
  const draft = props.mode === 'slots' && props.isValueDisabled?.(requestedDraft)
    ? firstEnabledSlot ?? requestedDraft
    : requestedDraft;
  const [draftHour, draftMinute] = normalizeTime(draft).split(':');
  const selectTimePart = (hour: string, minute: string) => setDraftOverride(`${hour}:${minute}`);
  const cancel = () => { setDraftOverride(null); props.onCancel(); };
  const draftDisabled = Boolean(props.disabled || props.isValueDisabled?.(draft));
  const confirm = () => { if (draftDisabled) return; setDraftOverride(null); props.onConfirm(draft); };

  function centerSelectedSlot() {
    if (props.mode === 'time') {
      hourList.current?.scrollToOffset({ animated: false, offset: Number(draftHour) * slotItemHeight });
      minuteList.current?.scrollToOffset({ animated: false, offset: Number(draftMinute) * slotItemHeight });
      return;
    }
    const selectedIndex = Math.max(0, props.options.findIndex((option) => option.value === draft));
    slotList.current?.scrollToOffset({ animated: false, offset: selectedIndex * slotItemHeight });
  }

  function selectSlot(index: number, value: string) {
    setDraftOverride(value);
    slotList.current?.scrollToOffset({ animated: true, offset: index * slotItemHeight });
  }

  return (
    <Modal animationType="slide" onRequestClose={cancel} onShow={centerSelectedSlot} transparent visible={props.visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.sheet} testID={props.testID}>
          <Text accessibilityRole="header" style={styles.title}>{props.title}</Text>
          {props.mode === 'slots' ? (
            <View accessibilityLabel="Selector de horario" style={styles.slotWheel} testID={`${props.testID}-wheel`}>
              <FlatList
                contentContainerStyle={styles.slotWheelContent}
                data={props.options}
                decelerationRate="fast"
                disableIntervalMomentum
                getItemLayout={(_, index) => ({ index, length: slotItemHeight, offset: slotItemHeight * index })}
                keyExtractor={(option) => option.value}
                onMomentumScrollEnd={(event) => {
                  const index = Math.max(0, Math.min(props.options.length - 1, Math.round(event.nativeEvent.contentOffset.y / slotItemHeight)));
                  const option = props.options[index];
                  if (option && !props.disabled && !props.isValueDisabled?.(option.value)) setDraftOverride(option.value);
                }}
                ref={slotList}
                renderItem={({ index, item }) => {
                  const selected = draft === item.value;
                  const disabled = Boolean(props.disabled || props.isValueDisabled?.(item.value));
                  return <Pressable accessibilityRole="radio" accessibilityState={{ disabled, selected }} disabled={disabled}
                    onPress={() => selectSlot(index, item.value)} style={[styles.slotOption, selected && styles.optionSelected]}
                    testID={`${props.testID}-option-${item.value}`}>
                    <Text style={[styles.optionText, !selected && styles.optionMuted, disabled && styles.optionDisabled]}>{item.label}</Text>
                  </Pressable>;
                }}
                showsVerticalScrollIndicator={false}
                snapToInterval={slotItemHeight}
                style={styles.slotList}
                testID={`${props.testID}-options`}
              />
              <View pointerEvents="none" style={styles.selectionIndicator} />
            </View>
          ) : (
            <View accessibilityLabel="Selector de hora" style={styles.wheel} testID={`${props.testID}-wheel`}>
              <FlatList
                contentContainerStyle={styles.timeWheelContent} data={Array.from({ length: 24 }, (_, hour) => hour)} decelerationRate="fast" disableIntervalMomentum initialNumToRender={24}
                getItemLayout={(_, index) => ({ index, length: slotItemHeight, offset: slotItemHeight * index })}
                keyExtractor={(hour) => String(hour)} onMomentumScrollEnd={(event) => selectTimePart(optionText(Math.max(0, Math.min(23, Math.round(event.nativeEvent.contentOffset.y / slotItemHeight)))), draftMinute)}
                ref={hourList} renderItem={({ item: hour }) => {
                  const value = optionText(hour);
                  const selected = draftHour === value;
                  return <Pressable accessibilityRole="radio" accessibilityState={{ disabled: props.disabled, selected }} disabled={props.disabled} key={value}
                    onPress={() => selectTimePart(value, draftMinute)} style={[styles.wheelOption, selected && styles.optionSelected]}
                    testID={`${props.testID}-hour-${value}`}><Text style={[styles.optionText, selected && draftDisabled && styles.optionDisabled]}>{value}</Text></Pressable>;
                }} showsVerticalScrollIndicator={false} snapToInterval={slotItemHeight} style={styles.timeList} testID={`${props.testID}-hours`} />
              <Text style={styles.separator}>:</Text>
              <FlatList
                contentContainerStyle={styles.timeWheelContent} data={Array.from({ length: 60 }, (_, minute) => minute)} decelerationRate="fast" disableIntervalMomentum initialNumToRender={60}
                getItemLayout={(_, index) => ({ index, length: slotItemHeight, offset: slotItemHeight * index })}
                keyExtractor={(minute) => String(minute)} onMomentumScrollEnd={(event) => selectTimePart(draftHour, optionText(Math.max(0, Math.min(59, Math.round(event.nativeEvent.contentOffset.y / slotItemHeight)))))}
                ref={minuteList} renderItem={({ item: minute }) => {
                  const value = optionText(minute);
                  const selected = draftMinute === value;
                  return <Pressable accessibilityRole="radio" accessibilityState={{ disabled: props.disabled, selected }} disabled={props.disabled} key={value}
                    onPress={() => selectTimePart(draftHour, value)} style={[styles.wheelOption, selected && styles.optionSelected]}
                    testID={`${props.testID}-minute-${value}`}><Text style={[styles.optionText, selected && draftDisabled && styles.optionDisabled]}>{value}</Text></Pressable>;
                }} showsVerticalScrollIndicator={false} snapToInterval={slotItemHeight} style={styles.timeList} testID={`${props.testID}-minutes`} />
            </View>
          )}
          <View style={styles.actions}>
            <Pressable accessibilityLabel="Cancelar" accessibilityRole="button" onPress={cancel} style={styles.secondaryButton} testID={`${props.testID}-cancel`}><Text style={styles.secondaryLabel}>Cancelar</Text></Pressable>
            <Pressable accessibilityLabel="Aceptar" accessibilityRole="button" accessibilityState={{ disabled: draftDisabled }} disabled={draftDisabled}
              onPress={confirm} style={[styles.primaryButton, draftDisabled && styles.buttonDisabled]} testID={`${props.testID}-confirm`}><Text style={styles.primaryLabel}>Aceptar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.35)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: tokens.color.surface, borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card, gap: tokens.space.md, padding: tokens.layout.screenInset },
  title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  slotWheel: { height: slotItemHeight * 3, position: 'relative' },
  slotList: { flex: 1 },
  slotWheelContent: { paddingVertical: slotItemHeight },
  slotOption: { alignItems: 'center', height: slotItemHeight, justifyContent: 'center' },
  selectionIndicator: { borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1, height: slotItemHeight, left: 0, position: 'absolute', right: 0, top: slotItemHeight },
  optionSelected: { backgroundColor: tokens.color.surfaceAccent },
  optionText: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, textAlign: 'center' },
  optionMuted: { color: tokens.color.muted },
  optionDisabled: { color: tokens.color.muted, textDecorationLine: 'line-through' },
  wheel: { alignItems: 'center', flexDirection: 'row', height: tokens.layout.controlHeight * 3, justifyContent: 'center' },
  timeList: { height: slotItemHeight * 3, width: tokens.layout.buttonHeight },
  timeWheelContent: { paddingVertical: slotItemHeight },
  wheelOption: { alignItems: 'center', height: slotItemHeight, justifyContent: 'center' },
  separator: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.sectionTitle },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  primaryButton: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, flex: 1, height: tokens.layout.buttonHeight, justifyContent: 'center' },
  secondaryButton: { alignItems: 'center', borderColor: tokens.color.brand, borderRadius: tokens.radius.control, borderWidth: 1, flex: 1, height: tokens.layout.buttonHeight, justifyContent: 'center' },
  primaryLabel: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  secondaryLabel: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  buttonDisabled: { backgroundColor: tokens.color.brandSoft },
});

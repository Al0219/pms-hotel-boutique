import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestNavigationShell } from '@/modules/navigation';
import { type HousekeepingService } from '@/modules/services/housekeeping/data/services/HousekeepingService';
import { type HousekeepingCleaningType, type HousekeepingTimeSlot } from '@/modules/services/housekeeping/domain/HousekeepingRequest';
import { useSubmitHousekeeping } from '@/modules/services/housekeeping/presentation/hooks/useSubmitHousekeeping';
import { housekeepingQaCleaningTypes, housekeepingQaTimeSlots } from '@/modules/services/housekeeping/presentation/housekeepingQaOptions';
import { housekeepingStyles } from '@/modules/services/housekeeping/presentation/housekeepingStyles';
import { servicesStyles as styles } from '@/modules/services/presentation/servicesStyles';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { deriveRemoteState } from '@/state/remoteState';
import { TimeWheelPicker, type TimeSlotOption } from '@/shared/components';

export interface HousekeepingScreenProps {
  service?: HousekeepingService;
  stayService?: StayService;
}

function Button({ label, onPress, testID, disabled = false }: {
  label: string; onPress: () => void; testID: string; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={[styles.button, disabled && styles.buttonDisabled]} testID={testID}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

function StateCard({ title, body, testID, offline = false }: {
  title: string; body: string; testID: string; offline?: boolean;
}) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.stateCard, offline && styles.offlineStateCard]} testID={testID}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

function returnToServices() {
  router.dismissTo('/services');
}

/** Form configuration is local; Stay Query and submission Mutation own remote state. */
export function HousekeepingScreen({ service, stayService }: HousekeepingScreenProps) {
  const query = useCurrentStay(stayService);
  const stay = deriveRemoteState(query, () => false);
  const submission = useSubmitHousekeeping(service);
  const [timeSlot, setTimeSlot] = useState<HousekeepingTimeSlot>('10:00–11:00');
  const [cleaningType, setCleaningType] = useState<HousekeepingCleaningType>('FULL_CLEANING');
  const [notes, setNotes] = useState('');
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [draftCleaningType, setDraftCleaningType] = useState(cleaningType);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollView>(null);

  function submit() {
    if (stay.kind !== 'success' || submission.isPending || submission.isSuccess || inFlight.current) return;
    const trimmedNotes = notes.trim();
    inFlight.current = true;
    submission.mutate({
      timeSlot,
      cleaningType,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    }, { onSettled: () => { inFlight.current = false; } });
  }

  const offline = submission.isError && submission.error instanceof NetworkError;
  const selectedCleaningType = housekeepingQaCleaningTypes.find((type) => type.value === cleaningType)!;
  const timeSlotOptions: readonly TimeSlotOption[] = housekeepingQaTimeSlots.map((slot) => ({ value: slot, label: slot }));

  return (
    <View style={styles.screen} testID="housekeeping-screen">
      <SafeAreaView edges={['top']} style={housekeepingStyles.backSafeArea}>
        <View style={housekeepingStyles.backHeader}>
          <Pressable accessibilityLabel="Volver a servicios" accessibilityRole="button" onPress={returnToServices}
            style={housekeepingStyles.backButton} testID="housekeeping-back-arrow"><Text style={housekeepingStyles.backArrow}>←</Text></Pressable>
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scroll}>
          <Text accessibilityRole="header" style={styles.title}>Limpieza incluida</Text>
          {submission.isSuccess ? (
            <StateCard title="Limpieza solicitada" body="Recibimos tu solicitud." testID="housekeeping-submit-success" />
          ) : stay.kind === 'loading' ? (
            <StateCard title="Cargando mi estadía" body="Espera un momento." testID="housekeeping-stay-loading" />
          ) : stay.kind === 'error' || stay.kind === 'offline' ? (
            <>
              <StateCard title={stay.kind === 'offline' ? 'Mi estadía sin conexión' : 'No pudimos cargar tu estadía'}
                body={stay.kind === 'offline' ? 'Conéctate y reintenta para recuperar tu estadía.' : 'Reintenta para recuperar los datos de tu estadía.'}
                offline={stay.kind === 'offline'} testID={`housekeeping-stay-${stay.kind}`} />
              <Button label="Reintentar" onPress={() => void query.refetch()} testID="housekeeping-stay-retry" disabled={query.isFetching} />
            </>
          ) : stay.kind === 'success' ? (
            <>
              <Text style={styles.serviceLabel} testID="housekeeping-room">
                {stay.data.room ? `Habitación ${stay.data.room.number}` : 'Habitación por asignar'}
              </Text>
              <Text accessibilityRole="header" style={styles.stateTitle}>Tipo de limpieza</Text>
              <Pressable accessibilityLabel="Seleccionar tipo de limpieza" accessibilityRole="button" accessibilityState={{ disabled: submission.isPending }}
                disabled={submission.isPending} onPress={() => { setDraftCleaningType(cleaningType); setTypePickerVisible(true); }}
                style={housekeepingStyles.selector} testID="housekeeping-type-selector"><Text style={styles.serviceLabel}>{selectedCleaningType.label}</Text><Text style={housekeepingStyles.chevron}>⌄</Text></Pressable>
              <Text accessibilityRole="header" style={styles.stateTitle}>Horario</Text>
              <Pressable accessibilityLabel="Seleccionar horario" accessibilityRole="button" accessibilityState={{ disabled: submission.isPending }}
                disabled={submission.isPending} onPress={() => setTimePickerVisible(true)} style={housekeepingStyles.selector} testID="housekeeping-time-selector"><Text style={styles.serviceLabel}>{timeSlot}</Text><Text style={housekeepingStyles.chevron}>⌄</Text></Pressable>
              <Text style={styles.serviceLabel}>Notas (opcional)</Text>
              <TextInput accessibilityLabel="Notas (opcional)" multiline value={notes} onChangeText={setNotes}
                editable={!submission.isPending} accessibilityState={{ disabled: submission.isPending }}
                onFocus={() => scroll.current?.scrollToEnd({ animated: true })}
                style={housekeepingStyles.notes} testID="housekeeping-notes" />
              {submission.isError ? (
                <StateCard title={offline ? 'Sin conexión' : 'No pudimos enviar tu solicitud'}
                  body={offline ? 'Conéctate a internet y reintenta tu solicitud.' : 'Intenta nuevamente.'}
                  offline={offline} testID={offline ? 'housekeeping-submit-offline' : 'housekeeping-submit-error'} />
              ) : null}
              <Button label={submission.isPending ? 'Enviando solicitud...' : submission.isError ? 'Reintentar' : 'Solicitar limpieza'}
                onPress={submit} disabled={submission.isPending} testID="housekeeping-submit" />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <GuestNavigationShell />
      <Modal animationType="slide" onRequestClose={() => setTypePickerVisible(false)} transparent visible={typePickerVisible}>
        <View style={housekeepingStyles.modalBackdrop}><View accessibilityViewIsModal style={housekeepingStyles.modalSheet} testID="housekeeping-type-picker"><Text accessibilityRole="header" style={styles.stateTitle}>Tipos disponibles</Text>
          {housekeepingQaCleaningTypes.map((type) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: draftCleaningType === type.value }} key={type.value}
            onPress={() => setDraftCleaningType(type.value)} style={[housekeepingStyles.typeOption, draftCleaningType === type.value && styles.serviceCardSelected]} testID={`housekeeping-type-option-${type.value}`}><Text style={styles.serviceLabel}>{type.label}</Text></Pressable>)}
          <View style={housekeepingStyles.modalActions}><Button label="Cancelar" onPress={() => setTypePickerVisible(false)} testID="housekeeping-type-cancel" /><Button label="Aceptar" onPress={() => { setCleaningType(draftCleaningType); setTypePickerVisible(false); }} testID="housekeeping-type-confirm" /></View>
        </View></View>
      </Modal>
      <TimeWheelPicker mode="slots" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { if (housekeepingQaTimeSlots.includes(value as HousekeepingTimeSlot)) setTimeSlot(value as HousekeepingTimeSlot); setTimePickerVisible(false); }} options={timeSlotOptions} testID="housekeeping-time-picker" title="Elegir horario" value={timeSlot} visible={timePickerVisible} />
    </View>
  );
}

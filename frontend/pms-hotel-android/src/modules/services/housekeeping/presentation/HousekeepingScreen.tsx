import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestNavigationShell } from '@/modules/navigation';
import { formatServiceDateLabel, getFirstAvailableServiceDate, getInitialServiceDate, getNearestServiceTime, isServiceDateWithinStay, isServiceWithinStayWindow, parseServiceDate, useSessionServiceRequests } from '@/modules/service-requests';
import { type HousekeepingService } from '@/modules/services/housekeeping/data/services/HousekeepingService';
import { type HousekeepingCleaningType, type HousekeepingTimeSlot } from '@/modules/services/housekeeping/domain/HousekeepingRequest';
import { useSubmitHousekeeping } from '@/modules/services/housekeeping/presentation/hooks/useSubmitHousekeeping';
import { housekeepingQaCleaningTypes, housekeepingQaTimeSlots } from '@/modules/services/housekeeping/presentation/housekeepingQaOptions';
import { housekeepingStyles } from '@/modules/services/housekeeping/presentation/housekeepingStyles';
import { servicesStyles as styles } from '@/modules/services/presentation/servicesStyles';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { deriveRemoteState } from '@/state/remoteState';
import { ServiceDatePicker, TimeWheelPicker, type TimeSlotOption } from '@/shared/components';

export interface HousekeepingScreenProps {
  service?: HousekeepingService;
  stayService?: StayService;
  nowMs?: () => number;
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
export function HousekeepingScreen({ service, stayService, nowMs = Date.now }: HousekeepingScreenProps) {
  const query = useCurrentStay(stayService);
  const stay = deriveRemoteState(query, () => false);
  const submission = useSubmitHousekeeping(service);
  const { addRequest, requests, updateRequest } = useSessionServiceRequests();
  const { editRequestId, returnTo } = useLocalSearchParams<{ editRequestId?: string; returnTo?: string }>();
  const [serviceDate, setServiceDate] = useState(() => getInitialServiceDate(nowMs(), housekeepingQaTimeSlots));
  const [timeSlot, setTimeSlot] = useState<HousekeepingTimeSlot>(() => getNearestServiceTime(getInitialServiceDate(nowMs(), housekeepingQaTimeSlots), housekeepingQaTimeSlots, nowMs()) as HousekeepingTimeSlot ?? housekeepingQaTimeSlots[0]);
  const [cleaningType, setCleaningType] = useState<HousekeepingCleaningType>('FULL_CLEANING');
  const [notes, setNotes] = useState('');
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [, setTimeCheckVersion] = useState(0);
  const [draftCleaningType, setDraftCleaningType] = useState(cleaningType);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const editLoaded = useRef<string | null>(null);
  const editedRequest = typeof editRequestId === 'string' ? requests.find((request) => request.sessionRequestId === editRequestId && request.details?.type === 'HOUSEKEEPING') : undefined;
  const returnFromEdit = () => router.dismissTo(returnTo === 'account' ? '/account' : returnTo === 'requests' ? '/services/requests' : '/services');

  useEffect(() => {
    const details = editedRequest?.details;
    if (!editedRequest || !details || details.type !== 'HOUSEKEEPING' || editLoaded.current === editedRequest.sessionRequestId) return;
    editLoaded.current = editedRequest.sessionRequestId;
    const timer = setTimeout(() => {
      if (details.serviceDate) setServiceDate(details.serviceDate);
      if (housekeepingQaTimeSlots.includes(details.timeSlot as HousekeepingTimeSlot)) setTimeSlot(details.timeSlot as HousekeepingTimeSlot);
      if (housekeepingQaCleaningTypes.some((item) => item.value === details.cleaningType)) setCleaningType(details.cleaningType as HousekeepingCleaningType);
      setNotes(details.notes ?? '');
    }, 0);
    return () => clearTimeout(timer);
  }, [editedRequest]);

  useEffect(() => {
    if (stay.kind !== 'success') return;
    const firstAvailable = getFirstAvailableServiceDate(nowMs(), housekeepingQaTimeSlots, stay.data.departure);
    const nearest = isServiceDateWithinStay(serviceDate, nowMs(), stay.data.departure)
      ? getNearestServiceTime(serviceDate, housekeepingQaTimeSlots, nowMs(), timeSlot, stay.data.departure)
      : null;
    if (nearest) return;
    const timer = setTimeout(() => {
      if (firstAvailable) {
        setServiceDate(firstAvailable);
        setTimeSlot(getNearestServiceTime(firstAvailable, housekeepingQaTimeSlots, nowMs(), undefined, stay.data.departure) as HousekeepingTimeSlot);
      } else if (!isServiceDateWithinStay(serviceDate, nowMs(), stay.data.departure)) setServiceDate(stay.data.departure);
    }, 0);
    return () => clearTimeout(timer);
  }, [serviceDate, stay, timeSlot, nowMs]);

  useEffect(() => {
    const interval = setInterval(() => setTimeCheckVersion((current) => current + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const serviceDateWithinStay = stay.kind === 'success' && isServiceDateWithinStay(serviceDate, nowMs(), stay.data.departure);
  const noAvailability = stay.kind === 'success' && getFirstAvailableServiceDate(nowMs(), housekeepingQaTimeSlots, stay.data.departure) === null;
  const timeSlotAllowed = stay.kind === 'success' && isServiceWithinStayWindow({ departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: timeSlot });

  function selectServiceDate(nextDate: string) {
    setDatePickerVisible(false);
    setServiceDate(nextDate);
    const nearest = stay.kind === 'success' ? getNearestServiceTime(nextDate, housekeepingQaTimeSlots, nowMs(), timeSlot, stay.data.departure) as HousekeepingTimeSlot | null : null;
    if (nearest) setTimeSlot(nearest);
  }

  function submit() {
    if (stay.kind !== 'success' || submission.isPending || submission.isSuccess || inFlight.current) return;
    if (!serviceDateWithinStay || !isServiceWithinStayWindow({ departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: timeSlot })) {
      setScheduleError(true);
      return;
    }
    setScheduleError(false);
    const trimmedNotes = notes.trim();
    inFlight.current = true;
    submission.mutate({
      serviceDate,
      timeSlot,
      cleaningType,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    }, {
      onSuccess: () => {
        const input = { kind: 'HOUSEKEEPING' as const, origin: 'SERVICES' as const, status: 'REQUESTED' as const, summary: `${formatServiceDateLabel(serviceDate)} · ${timeSlot}`, title: 'Limpieza', details: { type: 'HOUSEKEEPING' as const, serviceDate, cleaningType, timeSlot, ...(trimmedNotes ? { notes: trimmedNotes } : {}) } };
        if (editedRequest) updateRequest(editedRequest.sessionRequestId, input); else addRequest(input);
      },
      onSettled: () => { inFlight.current = false; },
    });
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
          <Text accessibilityRole="header" style={styles.title}>Limpieza</Text>
          {submission.isSuccess ? (
            <><StateCard title="Limpieza solicitada" body="Recibimos tu solicitud." testID="housekeeping-submit-success" />{editedRequest ? <Button label="Volver" onPress={returnFromEdit} testID="housekeeping-edit-return" /> : null}</>
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
              <Text accessibilityRole="header" style={styles.stateTitle}>Fecha</Text>
              <Pressable accessibilityLabel={`Seleccionar fecha del servicio: ${formatServiceDateLabel(serviceDate)}`} accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={housekeepingStyles.selector} testID="housekeeping-date-selector"><Text style={styles.serviceLabel}>{formatServiceDateLabel(serviceDate)}</Text><Text style={housekeepingStyles.chevron}>⌄</Text></Pressable>
              <Text accessibilityRole="header" style={styles.stateTitle}>Horario</Text>
              <Pressable accessibilityLabel="Seleccionar horario" accessibilityRole="button" accessibilityState={{ disabled: submission.isPending }}
                disabled={submission.isPending} onPress={() => { setScheduleError(false); setTimePickerVisible(true); }} style={housekeepingStyles.selector} testID="housekeeping-time-selector"><Text style={styles.serviceLabel}>{timeSlot}</Text><Text style={housekeepingStyles.chevron}>⌄</Text></Pressable>
              {noAvailability ? <StateCard title="Sin disponibilidad" body="No hay horarios disponibles durante tu estadía." testID="housekeeping-no-availability" /> : scheduleError || !timeSlotAllowed ? <StateCard title="Horario no disponible" body="Selecciona un horario con al menos 30 minutos de anticipación." testID="housekeeping-schedule-error" /> : null}
              <Text style={styles.serviceLabel}>Notas (opcional)</Text>
              <TextInput accessibilityLabel="Notas (opcional)" maxLength={500} multiline value={notes} onChangeText={setNotes}
                editable={!submission.isPending} accessibilityState={{ disabled: submission.isPending }}
                onFocus={() => scroll.current?.scrollToEnd({ animated: true })}
                style={housekeepingStyles.notes} testID="housekeeping-notes" />
              {submission.isError ? (
                <StateCard title={offline ? 'Sin conexión' : 'No pudimos enviar tu solicitud'}
                  body={offline ? 'Conéctate a internet y reintenta tu solicitud.' : 'Intenta nuevamente.'}
                  offline={offline} testID={offline ? 'housekeeping-submit-offline' : 'housekeeping-submit-error'} />
              ) : null}
              <Button label={submission.isPending ? 'Enviando solicitud...' : submission.isError ? 'Reintentar' : 'Solicitar limpieza'}
                onPress={submit} disabled={submission.isPending || !timeSlotAllowed} testID="housekeeping-submit" />
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
      <ServiceDatePicker maximumDate={stay.kind === 'success' ? parseServiceDate(stay.data.departure) ?? undefined : undefined} minimumDate={new Date(nowMs())} onCancel={() => setDatePickerVisible(false)} onConfirm={selectServiceDate} testID="housekeeping-date-picker" value={serviceDate} visible={datePickerVisible} />
      <TimeWheelPicker isValueDisabled={(value) => stay.kind !== 'success' || !isServiceWithinStayWindow({ departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: value })} mode="slots" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { if (stay.kind === 'success' && housekeepingQaTimeSlots.includes(value as HousekeepingTimeSlot) && isServiceWithinStayWindow({ departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: value })) { setScheduleError(false); setTimeSlot(value as HousekeepingTimeSlot); } setTimePickerVisible(false); }} options={timeSlotOptions} testID="housekeeping-time-picker" title="Elegir horario" value={timeSlot} visible={timePickerVisible} />
    </View>
  );
}

import {housekeepingLimitError} from '../domain/housekeepingLimits';
import {useHousekeepingScheduleRequests} from './hooks/useHousekeepingScheduleRequests';
import {ActionLabel} from '@/shared/components/ActionLabel';
import {useServiceCreationGate,ServiceCreationNotice} from '@/modules/checkout/presentation/hooks/useServiceCreationGate';
import { HttpError, NetworkError } from '@/data/remote/http/HttpError';
import { canModifyPersistedHousekeeping, type PersistedHousekeepingRequest } from '../domain/PersistedHousekeepingRequest';
import { useHousekeepingRequests } from './hooks/useHousekeepingRequests';
import { environment } from '@/config/environment';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { GuestCheckoutDueState, useCheckoutStatus } from '@/modules/checkout';
import { guestFeatureIcons, GuestChildHeader, GuestNavigationShell, useGuestNotice } from '@/modules/navigation';
import { getEffectiveCheckoutAt, getFirstAvailableServiceDate, getGuestStayActionStatus, getInitialServiceDate, getNearestServiceTime, getStayServiceDateWindow, isServiceDateWithinStay, isServiceWithinEffectiveCheckout, parseServiceDate, useSessionServiceRequests } from '@/modules/service-requests';
import { type HousekeepingService } from '@/modules/services/housekeeping/data/services/HousekeepingService';
import { type HousekeepingCleaningType, type HousekeepingTimeSlot } from '@/modules/services/housekeeping/domain/HousekeepingRequest';
import { useSubmitHousekeeping } from '@/modules/services/housekeeping/presentation/hooks/useSubmitHousekeeping';
import { housekeepingQaCleaningTypes, housekeepingQaTimeSlots } from '@/modules/services/housekeeping/presentation/housekeepingQaOptions';
import { housekeepingStyles } from '@/modules/services/housekeeping/presentation/housekeepingStyles';
import { servicesStyles as styles } from '@/modules/services/presentation/servicesStyles';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { deriveRemoteState } from '@/state/remoteState';
import { ServiceDatePicker, TimeWheelPicker, formatGuestDate, type TimeSlotOption } from '@/shared/components';
import { useAppClock } from '@/shared/time';
import { tokens } from '@/shared/theme/tokens';

const availableTimeSlots = housekeepingQaTimeSlots;
const availableCleaningTypes = environment.useMockApi ? housekeepingQaCleaningTypes : housekeepingQaCleaningTypes.filter(type => type.value === 'FULL_CLEANING');

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
      <ActionLabel label={label} textStyle={styles.buttonLabel}/>
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
export function HousekeepingScreen(props: HousekeepingScreenProps) {
  const { activeReservationContext: context } = useActiveReservationContext();
  const { editRequestId } = useLocalSearchParams<{ editRequestId?: string }>();
  const key = `${context?.reservationId}:${context?.reservationStayId}:${editRequestId ?? 'new'}`;
  return !environment.useMockApi && typeof editRequestId === 'string'
    ? <RealHousekeepingEditor key={key} {...props} requestId={editRequestId} />
    : <HousekeepingForm key={key} {...props} />;
}
function RealHousekeepingEditor({ requestId, ...props }: HousekeepingScreenProps & { requestId: string }) {
  const query = useHousekeepingRequests(props.service);
  const request = query.data?.find(row => row.id === requestId);
  const clock = useAppClock();
  const back = () => router.dismissTo('/services/requests');
  if (request && canModifyPersistedHousekeeping(request, (props.nowMs ?? clock.nowMs)())) {
    return <HousekeepingForm {...props} initialRequest={request} reloadRequest={async () => (await query.refetch()).data?.find(row => row.id === requestId)} />;
  }
  return <View style={styles.screen}><GuestChildHeader title="Limpieza" onBack={back} backAccessibilityLabel="Volver a mis servicios" backTestID="housekeeping-edit-back" /><View style={styles.content}>
    <StateCard title={query.isPending ? 'Cargando solicitud' : query.isError ? 'No pudimos cargar la solicitud' : 'Esta solicitud ya no admite cambios'} body={query.isError ? 'Revisa la conexión y actualiza las solicitudes.' : 'Puedes consultar su estado en Mis servicios.'} testID="housekeeping-edit-state" />
    {query.isError ? <Button label="Reintentar" onPress={() => void query.refetch()} testID="housekeeping-edit-retry" /> : null}
    <Button label="Volver a mis servicios" onPress={back} testID="housekeeping-edit-return" />
  </View><GuestNavigationShell /></View>;
}
function HousekeepingForm({ service, stayService, nowMs, initialRequest, reloadRequest }: HousekeepingScreenProps & { initialRequest?: PersistedHousekeepingRequest; reloadRequest?: () => Promise<PersistedHousekeepingRequest | undefined> }) {
  const serviceGate=useServiceCreationGate();
  const [editing, setEditing] = useState(initialRequest);
  const appClock = useAppClock();
  const getNowMs = nowMs ?? appClock.nowMs;
  const query = useCurrentStay(stayService);
  const stay = deriveRemoteState(query, () => false);
  const timezone = environment.useMockApi ? undefined : stay.kind === 'success' ? stay.data.timezone ?? '' : '';
  const submission = useSubmitHousekeeping(service, editing);
  const scheduleHistory=useHousekeepingScheduleRequests(service);
  const { addRequest, requests, updateRequest } = useSessionServiceRequests();
  const schedulingRequests = useMemo(() => environment.useMockApi ? requests : [], [requests]);
  const { isCheckedOut } = useCheckoutStatus();
  const { showServiceRequestSuccess } = useGuestNotice();
  const { editRequestId } = useLocalSearchParams<{ editRequestId?: string }>();
  const [serviceDate, setServiceDate] = useState(() => initialRequest?.serviceDate ?? getInitialServiceDate(getNowMs(), availableTimeSlots, timezone));
  const [timeSlot, setTimeSlot] = useState<HousekeepingTimeSlot>(() => initialRequest?.timeSlot as HousekeepingTimeSlot ?? getNearestServiceTime(getInitialServiceDate(getNowMs(), availableTimeSlots, timezone), availableTimeSlots, getNowMs(), environment.useMockApi ? undefined : '10:00–11:00', undefined, undefined, undefined, timezone) as HousekeepingTimeSlot ?? '10:00–11:00');
  const [cleaningType, setCleaningType] = useState<HousekeepingCleaningType>(initialRequest?.cleaningType as HousekeepingCleaningType ?? 'FULL_CLEANING');
  const [notes, setNotes] = useState(initialRequest?.notes ?? '');
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [, setTimeCheckVersion] = useState(0);
  const [draftCleaningType, setDraftCleaningType] = useState(cleaningType);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const editLoaded = useRef<string | null>(null);
  const editedRequest = environment.useMockApi && typeof editRequestId === 'string' ? requests.find((request) => request.sessionRequestId === editRequestId && request.details?.type === 'HOUSEKEEPING') : undefined;

  useEffect(() => {
    const details = editedRequest?.details;
    if (!editedRequest || !details || details.type !== 'HOUSEKEEPING' || editLoaded.current === editedRequest.sessionRequestId) return;
    editLoaded.current = editedRequest.sessionRequestId;
    const timer = setTimeout(() => {
      if (details.serviceDate) setServiceDate(details.serviceDate);
      if (availableTimeSlots.includes(details.timeSlot as HousekeepingTimeSlot)) setTimeSlot(details.timeSlot as HousekeepingTimeSlot);
      if (availableCleaningTypes.some((item) => item.value === details.cleaningType)) setCleaningType(details.cleaningType as HousekeepingCleaningType);
      setNotes(details.notes ?? '');
    }, 0);
    return () => clearTimeout(timer);
  }, [editedRequest]);

  useEffect(() => {
    if (initialRequest || stay.kind !== 'success') return;
    const firstAvailable = getFirstAvailableServiceDate(getNowMs(), availableTimeSlots, stay.data.arrival, stay.data.departure, getEffectiveCheckoutAt(stay.data, schedulingRequests, timezone), timezone);
    const nearest = isServiceDateWithinStay(serviceDate, getNowMs(), stay.data.arrival, stay.data.departure, timezone)
      ? getNearestServiceTime(serviceDate, availableTimeSlots, getNowMs(), timeSlot, stay.data.arrival, stay.data.departure, getEffectiveCheckoutAt(stay.data, schedulingRequests, timezone), timezone)
      : null;
    if (nearest) return;
    const timer = setTimeout(() => {
      if (firstAvailable) {
        setServiceDate(firstAvailable);
        setTimeSlot(getNearestServiceTime(firstAvailable, availableTimeSlots, getNowMs(), timeSlot, stay.data.arrival, stay.data.departure, getEffectiveCheckoutAt(stay.data, schedulingRequests, timezone), timezone) as HousekeepingTimeSlot);
      } else if (!isServiceDateWithinStay(serviceDate, getNowMs(), stay.data.arrival, stay.data.departure, timezone)) setServiceDate(stay.data.departure);
    }, 0);
    return () => clearTimeout(timer);
  }, [getNowMs, initialRequest, schedulingRequests, serviceDate, stay, timeSlot, timezone]);

  useEffect(() => {
    const interval = setInterval(() => setTimeCheckVersion((current) => current + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const serviceDateWithinStay = stay.kind === 'success' && isServiceDateWithinStay(serviceDate, getNowMs(), stay.data.arrival, stay.data.departure, timezone);
  const stayDateWindow = stay.kind === 'success' ? getStayServiceDateWindow(stay.data.arrival, stay.data.departure, getNowMs(), timezone) : null;
  const noAvailability = !editing && stay.kind === 'success' && getFirstAvailableServiceDate(getNowMs(), availableTimeSlots, stay.data.arrival, stay.data.departure, getEffectiveCheckoutAt(stay.data, schedulingRequests, timezone), timezone) === null;
  const canEdit = !editing || canModifyPersistedHousekeeping(editing, getNowMs());
  const cleaningRows=environment.useMockApi?requests.flatMap(r=>r.details?.type==='HOUSEKEEPING'&&r.details.serviceDate?[{id:r.sessionRequestId,serviceDate:r.details.serviceDate,timeSlot:r.details.timeSlot,status:r.status}]:[]):scheduleHistory.data;
  const limitError=housekeepingLimitError(cleaningRows,serviceDate,timeSlot,editing?.id??(environment.useMockApi?editRequestId:undefined),timezone);
  function scheduleAllowed(date: string, slot: string) {
    if(!scheduleHistory.ready||housekeepingLimitError(cleaningRows,date,slot,editing?.id??(environment.useMockApi?editRequestId:undefined),timezone))return false;
    if (editing && date === editing.serviceDate && slot === editing.timeSlot) return canEdit;
    return stay.kind === 'success' && isServiceWithinEffectiveCheckout({ arrival: stay.data.arrival, effectiveCheckoutAtMs: getEffectiveCheckoutAt(stay.data, schedulingRequests, timezone), endTime: slot.split('–')[1] ?? slot, nowMs: getNowMs(), serviceDate: date, startTime: slot, timezone });
  }
  const timeSlotAllowed = canEdit && scheduleAllowed(serviceDate, timeSlot);
  const lifecycle = stay.kind === 'success' ? getGuestStayActionStatus({ isCheckedOut, nowMs: getNowMs(), requests: schedulingRequests, stay: stay.data, timezone }) : isCheckedOut ? 'CHECKED_OUT' : 'ACTIVE';

  function selectServiceDate(nextDate: string) {
    setDatePickerVisible(false);
    setServiceDate(nextDate);
    const nearest = stay.kind === 'success' ? getNearestServiceTime(nextDate, availableTimeSlots, getNowMs(), timeSlot, stay.data.arrival, stay.data.departure, getEffectiveCheckoutAt(stay.data, schedulingRequests, timezone), timezone) as HousekeepingTimeSlot | null : null;
    if (nearest) setTimeSlot(nearest);
  }

  function submit() {
    if (serviceGate.blocked&&!editing || !canEdit || lifecycle !== 'ACTIVE' || stay.kind !== 'success' || submission.isPending || submission.isSuccess || inFlight.current) return;
    if (!serviceDateWithinStay || !scheduleAllowed(serviceDate, timeSlot)) {
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
        const input = { kind: 'HOUSEKEEPING' as const, origin: 'SERVICES' as const, status: 'REQUESTED' as const, summary: `${formatGuestDate(serviceDate)} · ${timeSlot}`, title: 'Limpieza', details: { type: 'HOUSEKEEPING' as const, serviceDate, cleaningType, timeSlot, ...(trimmedNotes ? { notes: trimmedNotes } : {}) } };
        if (environment.useMockApi) { if (editedRequest) updateRequest(editedRequest.sessionRequestId, input); else addRequest(input); } showServiceRequestSuccess(editedRequest || editing ? 'UPDATED' : 'CREATED'); router.replace('/account');
      },
      onSettled: () => { inFlight.current = false; },
    });
  }

  const offline = submission.isError && submission.error instanceof NetworkError;
  const selectedCleaningType = availableCleaningTypes.find((type) => type.value === cleaningType)!;
  const timeSlotOptions: readonly TimeSlotOption[] = availableTimeSlots.map((slot) => ({ value: slot, label: slot }));

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (typePickerVisible) { setTypePickerVisible(false); return true; }
      if (datePickerVisible) { setDatePickerVisible(false); return true; }
      if (timePickerVisible) { setTimePickerVisible(false); return true; }
      returnToServices();
      return true;
    });
    return () => subscription.remove();
  }, [datePickerVisible, timePickerVisible, typePickerVisible]);

  if (isCheckedOut) return <View style={styles.screen} testID="housekeeping-stay-completed"><GuestChildHeader backAccessibilityLabel="Volver a servicios" backTestID="housekeeping-back-arrow" onBack={returnToServices} title="Limpieza" /><View style={[styles.content, styles.stateContent]} testID="housekeeping-post-checkout-body"><StateCard body="Los servicios de estancia ya no están disponibles." testID="housekeeping-creation-blocked" title="Estancia finalizada" /></View><GuestNavigationShell /></View>;
  if (lifecycle === 'CHECKOUT_DUE') return <View style={styles.screen} testID="housekeeping-screen"><GuestChildHeader backAccessibilityLabel="Volver a servicios" backTestID="housekeeping-back-arrow" onBack={returnToServices} title="Limpieza" /><View style={[styles.content, styles.stateContent]} testID="housekeeping-post-checkout-body"><GuestCheckoutDueState actionTestID="housekeeping-checkout-due-action" testID="housekeeping-checkout-due" /></View><GuestNavigationShell /></View>;

  return (
    <View style={styles.screen} testID="housekeeping-screen">
      <GuestChildHeader backAccessibilityLabel="Volver a servicios" backTestID="housekeeping-back-arrow" onBack={returnToServices} title="Limpieza" />
      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scroll}>
          {submission.isSuccess ? <View testID="housekeeping-submit-success" /> : stay.kind === 'loading' ? (
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
                style={housekeepingStyles.selector} testID="housekeeping-type-selector"><Text style={styles.serviceLabel}>{selectedCleaningType.label}</Text><View accessible={false} testID={'housekeeping-type-selector-chevron'}><SymbolView accessibilityElementsHidden name={guestFeatureIcons.chevronDown} size={18} tintColor={tokens.color.muted} /></View></Pressable>
              <Text accessibilityRole="header" style={styles.stateTitle}>Fecha</Text>
              <Pressable accessibilityLabel={`Seleccionar fecha del servicio: ${formatGuestDate(serviceDate)}`} accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={housekeepingStyles.selector} testID="housekeeping-date-selector"><Text style={styles.serviceLabel}>{formatGuestDate(serviceDate)}</Text><View accessible={false} testID={'housekeeping-date-selector-chevron'}><SymbolView accessibilityElementsHidden name={guestFeatureIcons.chevronDown} size={18} tintColor={tokens.color.muted} /></View></Pressable>
              <Text accessibilityRole="header" style={styles.stateTitle}>Horario</Text>
              <Pressable accessibilityLabel="Seleccionar horario" accessibilityRole="button" accessibilityState={{ disabled: submission.isPending }}
                disabled={submission.isPending} onPress={() => { setScheduleError(false); setTimePickerVisible(true); }} style={housekeepingStyles.selector} testID="housekeeping-time-selector"><Text style={styles.serviceLabel}>{timeSlot}</Text><View accessible={false} testID={'housekeeping-time-selector-chevron'}><SymbolView accessibilityElementsHidden name={guestFeatureIcons.chevronDown} size={18} tintColor={tokens.color.muted} /></View></Pressable>
              {noAvailability ? <StateCard title="Sin disponibilidad" body="No hay horarios disponibles durante tu estadía." testID="housekeeping-no-availability" /> : scheduleError || !timeSlotAllowed ? <StateCard title="Horario no disponible" body={limitError??(!scheduleHistory.ready?'Actualiza tus limpiezas antes de solicitar.':'Selecciona un horario con 30 minutos de anticipación.')} testID="housekeeping-schedule-error" /> : null}
              <Text style={styles.serviceLabel}>Notas (opcional)</Text>
              <TextInput accessibilityLabel="Notas (opcional)" maxLength={500} multiline value={notes} onChangeText={setNotes}
                editable={!submission.isPending} accessibilityState={{ disabled: submission.isPending }}
                onFocus={() => scroll.current?.scrollToEnd({ animated: true })}
                style={housekeepingStyles.notes} testID="housekeeping-notes" />
              {submission.isError ? (
                <StateCard title={offline ? 'Sin conexión' : 'No pudimos enviar tu solicitud'}
                  body={offline ? 'Conéctate a internet y reintenta tu solicitud.' : editing && submission.error instanceof HttpError && submission.error.status === 409 ? 'La solicitud cambió o ya no admite cambios. Actualiza la solicitud para comprobar su estado.' : submission.error instanceof HttpError && submission.error.status === 400 ? 'La fecha o franja ya no es válida. Selecciona otra dentro de tu estancia y con 30 minutos de anticipación.' : 'Intenta nuevamente.'}
                  offline={offline} testID={offline ? 'housekeeping-submit-offline' : 'housekeeping-submit-error'} />
              ) : null}
              {editing && submission.isError ? <Button label="Actualizar solicitud" testID="housekeeping-edit-reload" disabled={submission.isPending} onPress={() => { void reloadRequest?.().then(fresh => { if (fresh?.status === 'OPEN') { setEditing(fresh); setServiceDate(fresh.serviceDate); setTimeSlot(fresh.timeSlot as HousekeepingTimeSlot); setCleaningType(fresh.cleaningType as HousekeepingCleaningType); setNotes(fresh.notes ?? ''); submission.reset(); } }); }} /> : null}
              <Button label={submission.isPending ? 'Enviando solicitud...' : editing ? 'Guardar cambios' : submission.isError ? 'Reintentar' : 'Solicitar limpieza'}
                onPress={submit} disabled={submission.isPending || !timeSlotAllowed || serviceGate.blocked&&!editing} testID="housekeeping-submit" />
            </>
          ) : null}
        <ServiceCreationNotice message={serviceGate.message}/></ScrollView>
      </KeyboardAvoidingView>
      <GuestNavigationShell />
      <Modal animationType="slide" onRequestClose={() => setTypePickerVisible(false)} transparent visible={typePickerVisible}>
        <View style={housekeepingStyles.modalBackdrop}><View accessibilityViewIsModal style={housekeepingStyles.modalSheet} testID="housekeeping-type-picker"><Text accessibilityRole="header" style={styles.stateTitle}>Tipos disponibles</Text>
          {availableCleaningTypes.map((type) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: draftCleaningType === type.value }} key={type.value}
            onPress={() => setDraftCleaningType(type.value)} style={[housekeepingStyles.typeOption, draftCleaningType === type.value && styles.serviceCardSelected]} testID={`housekeeping-type-option-${type.value}`}><Text style={styles.serviceLabel}>{type.label}</Text></Pressable>)}
          <View style={housekeepingStyles.modalActions}><Button label="Cancelar" onPress={() => setTypePickerVisible(false)} testID="housekeeping-type-cancel" /><Button label="Aceptar" onPress={() => { setCleaningType(draftCleaningType); setTypePickerVisible(false); }} testID="housekeeping-type-confirm" /></View>
        </View></View>
      </Modal>
      <ServiceDatePicker maximumDate={stayDateWindow ? parseServiceDate(stayDateWindow.maximumDate) ?? undefined : undefined} minimumDate={stayDateWindow ? parseServiceDate(stayDateWindow.minimumDate) ?? new Date(getNowMs()) : new Date(getNowMs())} onCancel={() => setDatePickerVisible(false)} onConfirm={selectServiceDate} testID="housekeeping-date-picker" value={serviceDate} visible={datePickerVisible && stayDateWindow !== null} />
      <TimeWheelPicker isValueDisabled={(value) => stay.kind !== 'success' || !scheduleAllowed(serviceDate, value)} mode="slots" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { if (stay.kind === 'success' && availableTimeSlots.includes(value as HousekeepingTimeSlot) && scheduleAllowed(serviceDate, value)) { setScheduleError(false); setTimeSlot(value as HousekeepingTimeSlot); } setTimePickerVisible(false); }} options={timeSlotOptions} testID="housekeeping-time-picker" title="Elegir horario" value={timeSlot} visible={timePickerVisible} />
    </View>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { useCheckoutStatus } from '@/modules/checkout';
import { GuestChildHeader, GuestNavigationShell, useGuestNotice } from '@/modules/navigation';
import { formatServiceDate, formatServiceDateLabel, getFirstAvailableServiceDate, getNearestServiceTime, getStayServiceDateWindow, isServiceDateWithinStay, isServiceWithinStayWindow, parseServiceDate, useSessionServiceRequests } from '@/modules/service-requests';
import { amenitiesCatalogFixture } from '@/modules/services/amenities/data/mocks/amenitiesCatalogFixture';
import { type AmenitiesService } from '@/modules/services/amenities/data/services/AmenitiesService';
import {
  AMENITIES_MAX_ITEM_QUANTITY,
  areAmenitiesRequestItemsValid,
  type AmenitiesRequestItem,
} from '@/modules/services/amenities/domain/AmenitiesRequest';
import { useSubmitAmenities } from '@/modules/services/amenities/presentation/hooks/useSubmitAmenities';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { ConfirmationModal, ServiceCatalogItemCard, ServiceDatePicker, SwipeToDelete, TimeWheelPicker } from '@/shared/components';
import { tokens } from '@/shared/theme/tokens';
import { deriveRemoteState } from '@/state/remoteState';

const times = Array.from({ length: 24 * 60 }, (_, index) => `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`);
const quantityFor = (items: readonly AmenitiesRequestItem[], key: string) => items.find((item) => item.itemFixtureKey === key)?.quantity ?? 0;
const totalQuantity = (items: readonly AmenitiesRequestItem[]) => items.reduce((total, item) => total + item.quantity, 0);

export function updateAmenitiesQuantity(items: readonly AmenitiesRequestItem[], key: string, nextQuantity: number): readonly AmenitiesRequestItem[] {
  if (nextQuantity <= 0) return items.filter((item) => item.itemFixtureKey !== key);
  if (nextQuantity > AMENITIES_MAX_ITEM_QUANTITY) return items;
  const exists = items.some((item) => item.itemFixtureKey === key);
  return exists ? items.map((item) => item.itemFixtureKey === key ? { ...item, quantity: nextQuantity } : item) : [...items, { itemFixtureKey: key, quantity: nextQuantity }];
}

export interface AmenitiesScreenProps { service?: AmenitiesService; stayService?: StayService; nowMs?: () => number; }

function StateCard({ title, body, testID, action, offline = false }: { title: string; body: string; testID: string; action?: () => void; offline?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[styles.stateCard, offline && styles.offline]} testID={testID}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.body}>{body}</Text>{action ? <Button label="Reintentar" onPress={action} testID={`${testID}-retry`} /> : null}</View>;
}
function Button({ label, onPress, testID, disabled = false }: { label: string; onPress: () => void; testID: string; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]} testID={testID}><Text style={styles.buttonLabel}>{label}</Text></Pressable>;
}

/** Amenities uses a fixed frontend/mock catalogue and Query-owned current Stay context. */
export function AmenitiesScreen({ service, stayService, nowMs = Date.now }: AmenitiesScreenProps) {
  const stayQuery = useCurrentStay(stayService);
  const stay = deriveRemoteState(stayQuery, () => false);
  const submit = useSubmitAmenities(service);
  const { addRequest, requests, updateRequest } = useSessionServiceRequests();
  const { isCheckedOut } = useCheckoutStatus();
  const { showServiceRequestSuccess } = useGuestNotice();
  const { editRequestId, returnTo } = useLocalSearchParams<{ editRequestId?: string; returnTo?: string }>();
  const [items, setItems] = useState<readonly AmenitiesRequestItem[]>([]);
  const [notes, setNotes] = useState('');
  const [serviceDate, setServiceDate] = useState(() => formatServiceDate(new Date(nowMs())));
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [step, setStep] = useState<'CATALOG' | 'CART' | 'SCHEDULE'>('CATALOG');
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [discardVisible, setDiscardVisible] = useState(false);
  const inFlight = useRef(false);
  const editLoaded = useRef<string | null>(null);
  const [initialEditDraft, setInitialEditDraft] = useState<string | null>(null);
  const pendingExit = useRef<(() => void) | null>(null);
  const edited = typeof editRequestId === 'string' ? requests.find((request) => request.sessionRequestId === editRequestId && request.details?.type === 'AMENITIES') : undefined;

  useEffect(() => {
    const details = edited?.details;
    if (!edited || !details || details.type !== 'AMENITIES' || editLoaded.current === edited.sessionRequestId) return;
    editLoaded.current = edited.sessionRequestId;
    const timer = setTimeout(() => { setItems(details.items); setNotes(details.notes ?? ''); setServiceDate(details.serviceDate); setDeliveryTime(details.deliveryTime); setInitialEditDraft(JSON.stringify({ items: details.items, notes: details.notes ?? '', serviceDate: details.serviceDate, deliveryTime: details.deliveryTime })); setStep('CART'); }, 0);
    return () => clearTimeout(timer);
  }, [edited]);
  useEffect(() => {
    if (stay.kind !== 'success') return;
    const firstDate = getFirstAvailableServiceDate(nowMs(), times, stay.data.arrival, stay.data.departure);
    const nextTime = isServiceDateWithinStay(serviceDate, nowMs(), stay.data.arrival, stay.data.departure)
      ? getNearestServiceTime(serviceDate, times, nowMs(), deliveryTime, stay.data.arrival, stay.data.departure) : null;
    if (nextTime) { if (nextTime !== deliveryTime) { const timer = setTimeout(() => setDeliveryTime(nextTime), 0); return () => clearTimeout(timer); } return; }
    if (firstDate) { const timer = setTimeout(() => { setServiceDate(firstDate); setDeliveryTime(getNearestServiceTime(firstDate, times, nowMs(), undefined, stay.data.arrival, stay.data.departure)); }, 0); return () => clearTimeout(timer); }
  }, [deliveryTime, nowMs, serviceDate, stay]);

  const allowed = stay.kind === 'success' && deliveryTime !== null && isServiceWithinStayWindow({ arrival: stay.data.arrival, departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: deliveryTime });
  const stayDateWindow = stay.kind === 'success' ? getStayServiceDateWindow(stay.data.arrival, stay.data.departure, nowMs()) : null;
  const noAvailability = stay.kind === 'success' && getFirstAvailableServiceDate(nowMs(), times, stay.data.arrival, stay.data.departure) === null;
  const pending = submit.isPending;
  const offline = submit.isError && submit.error instanceof NetworkError;
  const genericError = submit.isError && !offline;
  const returnFromEdit = () => router.dismissTo(returnTo === 'account' ? '/account' : returnTo === 'requests' ? '/services/requests' : '/services');
  const changeQuantity = (key: string, next: number) => setItems((current) => updateAmenitiesQuantity(current, key, next));
  const isDirty = items.length > 0 && (!edited || initialEditDraft !== JSON.stringify({ items, notes, serviceDate, deliveryTime }));

  if (isCheckedOut) return <View style={styles.screen} testID="amenities-stay-completed"><GuestChildHeader backAccessibilityLabel="Volver" backTestID="amenities-back" onBack={() => router.dismissTo('/services')} title="Amenidades" /><View style={styles.content}><StateCard body="Los servicios de estancia ya no están disponibles." testID="amenities-creation-blocked" title="Estancia finalizada" /></View><GuestNavigationShell /></View>;

  function resetCreate() {
    setItems([]); setNotes(''); setScheduleError(false); setStep('CATALOG');
  }
  function requestExit(action: () => void) {
    if (!isDirty) { action(); return; }
    pendingExit.current = action;
    setDiscardVisible(true);
  }
  function discardAndExit() {
    setDiscardVisible(false);
    if (!edited) resetCreate();
    const action = pendingExit.current;
    pendingExit.current = null;
    action?.();
  }
  function selectDate(value: string) { setDatePickerVisible(false); setServiceDate(value); setDeliveryTime(stay.kind === 'success' ? getNearestServiceTime(value, times, nowMs(), deliveryTime, stay.data.arrival, stay.data.departure) : null); }
  function send() {
    if (stay.kind !== 'success' || !areAmenitiesRequestItemsValid(items) || !deliveryTime || !allowed || pending || submit.isSuccess || inFlight.current) { if (items.length > 0 && !allowed) setScheduleError(true); return; }
    const trimmedNotes = notes.trim(); inFlight.current = true; setScheduleError(false);
    const request = { serviceDate, deliveryTime, items, ...(trimmedNotes ? { notes: trimmedNotes } : {}) };
    submit.mutate(request, { onSettled: () => { inFlight.current = false; }, onSuccess: () => {
      const count = totalQuantity(items);
      const input = { kind: 'AMENITIES' as const, origin: 'SERVICES' as const, status: 'REQUESTED' as const, title: 'Amenidades', summary: `${formatServiceDateLabel(serviceDate)} · ${deliveryTime} · ${count} ${count === 1 ? 'artículo' : 'artículos'}`, details: { type: 'AMENITIES' as const, ...request } };
      if (edited) updateRequest(edited.sessionRequestId, input); else { addRequest(input); resetCreate(); } showServiceRequestSuccess(edited ? 'UPDATED' : 'CREATED'); router.replace('/account');
    }});
  }

  const goBack = () => { if (step === 'SCHEDULE') setStep('CART'); else if (step === 'CART') setStep('CATALOG'); else requestExit(edited ? returnFromEdit : () => router.dismissTo('/services')); };
  return <View style={styles.screen} testID="amenities-screen"><GuestChildHeader backAccessibilityLabel="Volver" backTestID="amenities-back" onBack={goBack} rightAccessory={step === 'CATALOG' ? <Pressable accessibilityLabel="Abrir carrito" accessibilityRole="button" onPress={() => setStep('CART')} style={styles.cart} testID="amenities-cart-button"><Text>🛒 <Text testID="amenities-cart-badge">{totalQuantity(items)}</Text></Text></Pressable> : undefined} title="Amenidades" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {submit.isSuccess ? <View testID="amenities-success" /> :
      stay.kind === 'loading' ? <StateCard body="Espera un momento." testID="amenities-stay-loading" title="Cargando mi estadía" /> :
      stay.kind === 'offline' || stay.kind === 'error' ? <StateCard action={() => void stayQuery.refetch()} body={stay.kind === 'offline' ? 'Conéctate y reintenta para recuperar tu estadía.' : 'Intenta nuevamente.'} offline={stay.kind === 'offline'} testID={`amenities-stay-${stay.kind}`} title={stay.kind === 'offline' ? 'Mi estadía sin conexión' : 'No pudimos cargar tu estadía'} /> :
      stay.kind === 'success' ? <>{step === 'CATALOG' ? <><Text style={styles.room} testID="amenities-room">{stay.data.room ? `Habitación ${stay.data.room.number}` : 'Habitación por asignar'}</Text><Text style={styles.section}>Artículos</Text>{amenitiesCatalogFixture.map((item) => { const quantity = quantityFor(items, item.fixtureKey); return <ServiceCatalogItemCard disabled={pending} incrementDisabled={quantity >= AMENITIES_MAX_ITEM_QUANTITY} key={item.fixtureKey} onDecrement={() => changeQuantity(item.fixtureKey, quantity - 1)} onIncrement={() => changeQuantity(item.fixtureKey, quantity + 1)} quantity={quantity} testID={`amenities-item-${item.fixtureKey}`} title={item.name} />; })}</> : null}
        {step === 'CART' ? <><Text style={styles.section}>Resumen</Text>{items.length === 0 ? <Text style={styles.body}>Aún no has agregado artículos.</Text> : items.map((line) => { const item = amenitiesCatalogFixture.find((value) => value.fixtureKey === line.itemFixtureKey); return item ? <SwipeToDelete deleteLabel={`Eliminar ${item.name}`} key={line.itemFixtureKey} onDelete={() => setPendingRemoval(line.itemFixtureKey)} testID={`amenities-cart-${line.itemFixtureKey}`}><ServiceCatalogItemCard incrementDisabled={line.quantity >= AMENITIES_MAX_ITEM_QUANTITY} onDecrement={() => changeQuantity(line.itemFixtureKey, line.quantity - 1)} onIncrement={() => changeQuantity(line.itemFixtureKey, line.quantity + 1)} quantity={line.quantity} testID={`amenities-cart-item-${line.itemFixtureKey}`} title={item.name} /></SwipeToDelete> : null; })}<Text style={styles.label}>Notas para el hotel</Text><TextInput accessibilityLabel="Notas para el hotel" editable={!pending} maxLength={500} multiline onChangeText={setNotes} style={styles.notes} testID="amenities-notes" value={notes} /><Button disabled={!areAmenitiesRequestItemsValid(items) || pending} label="Siguiente" onPress={() => setStep('SCHEDULE')} testID="amenities-next" /></> : null}
        {step === 'SCHEDULE' ? <><Text style={styles.section}>Programar entrega</Text><Text style={styles.body}>{totalQuantity(items)} {totalQuantity(items) === 1 ? 'artículo' : 'artículos'}</Text><Text style={styles.label}>Fecha</Text><Pressable accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={styles.picker} testID="amenities-date-selector"><Text>{formatServiceDateLabel(serviceDate)}</Text></Pressable><Text style={styles.label}>Hora</Text><Pressable accessibilityRole="button" onPress={() => setTimePickerVisible(true)} style={styles.picker} testID="amenities-time-selector"><Text>{deliveryTime ?? 'Seleccionar hora'}</Text></Pressable>{noAvailability ? <StateCard body="No hay horarios disponibles durante tu estadía." testID="amenities-no-availability" title="Sin disponibilidad" /> : scheduleError ? <StateCard body="Selecciona una hora con al menos 30 minutos de anticipación." testID="amenities-schedule-error" title="Hora no disponible" /> : null}{genericError || offline ? <StateCard action={send} body={offline ? 'Conéctate a internet y reintenta.' : 'Intenta nuevamente.'} offline={offline} testID={offline ? 'amenities-submit-offline' : 'amenities-submit-error'} title={offline ? 'Sin conexión' : 'No pudimos enviar tu solicitud'} /> : null}<Button disabled={!areAmenitiesRequestItemsValid(items) || !allowed || pending || noAvailability} label={pending ? 'Solicitando...' : genericError || offline ? 'Reintentar' : 'Confirmar solicitud'} onPress={send} testID="amenities-submit" /></> : null}
      </> : null}
    </ScrollView>
    <ServiceDatePicker maximumDate={stayDateWindow ? parseServiceDate(stayDateWindow.maximumDate) ?? undefined : undefined} minimumDate={stayDateWindow ? parseServiceDate(stayDateWindow.minimumDate) ?? new Date(nowMs()) : new Date(nowMs())} onCancel={() => setDatePickerVisible(false)} onConfirm={selectDate} testID="amenities-date-picker" value={serviceDate} visible={datePickerVisible && stayDateWindow !== null} />
    <TimeWheelPicker isValueDisabled={(value) => stay.kind !== 'success' || !isServiceWithinStayWindow({ arrival: stay.data.arrival, departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: value })} mode="time" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { setTimePickerVisible(false); if (stay.kind === 'success' && isServiceWithinStayWindow({ arrival: stay.data.arrival, departure: stay.data.departure, nowMs: nowMs(), serviceDate, startTime: value })) { setDeliveryTime(value); setScheduleError(false); } }} testID="amenities-time-picker" title="Elegir hora de entrega" value={deliveryTime ?? '00:00'} visible={timePickerVisible} />
    <ConfirmationModal body={`¿Quieres quitar ${amenitiesCatalogFixture.find((item) => item.fixtureKey === pendingRemoval)?.name ?? ''} del carrito?`} confirmLabel="Eliminar" destructive onCancel={() => setPendingRemoval(null)} onConfirm={() => { if (pendingRemoval) changeQuantity(pendingRemoval, 0); setPendingRemoval(null); }} testID="amenities-cart-remove-modal" title="Eliminar del carrito" visible={pendingRemoval !== null} />
    <ConfirmationModal body={edited ? 'Los cambios que no hayas guardado se perderán.' : 'Los productos del carrito se eliminarán si sales de esta pantalla.'} confirmLabel="Salir" onCancel={() => setDiscardVisible(false)} onConfirm={discardAndExit} testID="amenities-discard-modal" title={edited ? '¿Descartar cambios?' : '¿Salir del servicio?'} visible={discardVisible} />
    <GuestNavigationShell onNavigateAway={(basePath) => requestExit(() => router.replace(basePath))} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 }, content: { gap: tokens.space.md, padding: tokens.layout.screenInset, paddingBottom: tokens.space.xxl }, cart: { marginLeft: 'auto', padding: tokens.space.sm }, room: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium }, section: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' }, item: { alignItems: 'center', backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: tokens.space.md }, name: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label }, stepper: { alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm }, stepperButton: { alignItems: 'center', backgroundColor: tokens.color.surfaceAccent, borderRadius: tokens.radius.control, height: tokens.layout.buttonHeight, justifyContent: 'center', width: tokens.layout.buttonHeight }, stepperLabel: { color: tokens.color.brand, fontSize: tokens.typography.size.sectionTitle }, label: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label }, picker: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, minHeight: tokens.layout.controlHeight, justifyContent: 'center', paddingHorizontal: tokens.space.md }, notes: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, color: tokens.color.inkStrong, fontFamily: tokens.typography.family, minHeight: tokens.layout.controlHeight * 2, padding: tokens.space.sm, textAlignVertical: 'top' }, button: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, minHeight: tokens.layout.buttonHeight, justifyContent: 'center', paddingHorizontal: tokens.space.md }, editItems: { alignItems: 'center', minHeight: tokens.layout.buttonHeight, justifyContent: 'center' }, editItemsLabel: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' }, buttonLabel: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' }, disabled: { backgroundColor: tokens.color.brandSoft }, stateCard: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.md }, offline: { backgroundColor: tokens.color.pendingSurface }, stateTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' }, body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
});

import {TransferModal,PlaceSelector} from './TransferModals';
import {StateCard,VehicleModal,RegisterVehicleModal,vehicleDisplay,vehicleStatusText,type RegisterVehicleModalHandle} from './ValetVehicleModals';
import { buildTransferSessionRequestInput } from '@/modules/valet/domain/buildTransferSessionRequestInput';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestCheckoutDueState, useCheckoutStatus } from '@/modules/checkout';
import { guestFeatureIcons, GuestNavigationShell, GuestRootHeader, useGuestNotice } from '@/modules/navigation';
import { formatServiceDate, getEffectiveCheckoutAt, getFirstAvailableServiceDate, getGuestStayActionStatus, getInitialServiceDate, getNearestServiceTime, getStayServiceDateWindow, isServiceDateWithinStay, isServiceWithinEffectiveCheckout, parseServiceDate, useSessionServiceRequests } from '@/modules/service-requests';
import {
  GoogleMapsLinkingService,
  type ExternalMapService,
} from '@/modules/valet/data/services/GoogleMapsLinkingService';
import { type TransferRouteService } from '@/modules/valet/data/services/TransferRouteService';
import { type ValetService } from '@/modules/valet/data/services/ValetService';
import { type Clock } from '@/modules/valet/domain/services/Clock';
import { calculateTransferFare } from '@/modules/valet/domain/services/TransferFareCalculator';
import {
  getMinimumTransferDateTime,
  isTransferScheduleValid,
  replaceTransferDate,
  replaceTransferTime,
  startOfTransferDay,
} from '@/modules/valet/domain/services/TransferSchedule';
import { useRequestValetVehicle } from '@/modules/valet/presentation/hooks/useRequestValetVehicle';
import { useReserveTransfer } from '@/modules/valet/presentation/hooks/useReserveTransfer';
import { useTransferRouteEstimate } from '@/modules/valet/presentation/hooks/useTransferRouteEstimate';
import { useValetScreen } from '@/modules/valet/presentation/hooks/useValetScreen';
import { valetStyles } from '@/modules/valet/presentation/valetStyles';
import { useSessionVehicles } from '@/modules/valet/session/SessionVehiclesProvider';
import { formatVehiclePlate } from '@/modules/valet/session/vehicleValidation';
import { deriveRemoteState } from '@/state/remoteState';
import { ServiceDatePicker, TimeWheelPicker, formatGuestDate } from '@/shared/components';
import { getServiceAvailabilityHint, useAppClock } from '@/shared/time';
import { tokens } from '@/shared/theme/tokens';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { SymbolView } from 'expo-symbols';

const defaultMapService = new GoogleMapsLinkingService();
const allDayTimes = Array.from({ length: 24 * 60 }, (_, index) => `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`);

export interface ValetScreenProps {
  service?: ValetService;
  routeService?: TransferRouteService;
  mapService?: ExternalMapService;
  clock?: Clock;
  stayService?: StayService;
}

type SelectorTarget = 'destination' | 'pickup' | null;

function format24Hour(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function ValetScreen({ clock: injectedClock, mapService = defaultMapService, routeService, service, stayService }: ValetScreenProps) {
  const appClock = useAppClock();
  const clock: Clock = injectedClock ?? appClock;
  const { isCheckedOut } = useCheckoutStatus();
  const valetQuery = useValetScreen(service);
  const valetState = deriveRemoteState(valetQuery, () => false);
  const stay = deriveRemoteState(useCurrentStay(stayService), () => false);
  const [activeVehicleKey, setActiveVehicleKey] = useState<string | null>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [registerVehicleVisible, setRegisterVehicleVisible] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleTimePickerVisible, setVehicleTimePickerVisible] = useState(false);
  const [vehicleDatePickerVisible, setVehicleDatePickerVisible] = useState(false);
  const [vehicleServiceDate, setVehicleServiceDate] = useState(() => getInitialServiceDate(clock.getNow().getTime(), allDayTimes));
  const [requestedTime, setRequestedTime] = useState<string | null>(() => getNearestServiceTime(getInitialServiceDate(clock.getNow().getTime(), allDayTimes), allDayTimes, clock.getNow().getTime()));
  const [vehicleScheduleError, setVehicleScheduleError] = useState(false);
  const [, setTimeCheckVersion] = useState(0);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectorTarget, setSelectorTarget] = useState<SelectorTarget>(null);
  const [destinationKey, setDestinationKey] = useState<string | null>(null);
  const [pickupKey, setPickupKey] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(() => getMinimumTransferDateTime(clock.getNow()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [showScheduleFeedback, setShowScheduleFeedback] = useState(false);
  const [passengers, setPassengers] = useState(2);
  const [mapError, setMapError] = useState(false);
  const [ignoredTransferEditRequestId, setIgnoredTransferEditRequestId] = useState<string | null>(null);
  const vehicleRequest = useRequestValetVehicle(service);
  const transferReservation = useReserveTransfer(service);
  const { addRequest, requests, updateRequest } = useSessionServiceRequests();
  const { showServiceRequestSuccess } = useGuestNotice();
  const { editRequestId } = useLocalSearchParams<{ editRequestId?: string }>();
  const { addVehicle, setVehicleStatus, updateVehicle, vehicles } = useSessionVehicles();
  const vehicleInFlight = useRef(false);
  const transferInFlight = useRef(false);
  const editLoaded = useRef<string | null>(null);
  const registerVehicleForm = useRef<RegisterVehicleModalHandle>(null);
  const screen = valetState.kind === 'success' ? valetState.data : null;
  const hotel = screen?.places.find((place) => place.type === 'HOTEL') ?? null;
  const destination = screen?.places.find((place) => place.key === (destinationKey ?? screen.transfer.defaultDestinationKey)) ?? null;
  const pickup = screen?.places.find((place) => place.key === pickupKey) ?? null;
  const origin = destination?.type === 'HOTEL' ? pickup : hotel;
  const route = useTransferRouteEstimate(origin?.key ?? null, destination?.key ?? null, routeService);
  const fare = route.data ? calculateTransferFare(route.data) : null;
  const arrival = stay.kind === 'success' ? stay.data.arrival : null;
  const departure = stay.kind === 'success' ? stay.data.departure : null;
  const effectiveCheckoutAtMs = stay.kind === 'success' ? getEffectiveCheckoutAt(stay.data, requests) : null;
  const lifecycle = stay.kind === 'success'
    ? getGuestStayActionStatus({ isCheckedOut, nowMs: clock.getNow().getTime(), requests, stay: stay.data })
    : isCheckedOut ? 'CHECKED_OUT' : 'ACTIVE';
  const stayDateWindow = arrival !== null && departure !== null ? getStayServiceDateWindow(arrival, departure, clock.getNow().getTime()) : null;
  const transferWithinStay = arrival !== null && isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: formatServiceDate(scheduledAt), startTime: format24Hour(scheduledAt) });
  const transferNoAvailability = arrival !== null && departure !== null && getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, arrival, departure, effectiveCheckoutAtMs) === null;
  const vehicleNoAvailability = arrival === null || departure === null || getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, arrival, departure, effectiveCheckoutAtMs) === null;
  const transferAvailabilityHint = getServiceAvailabilityHint({ effectiveCheckoutAtMs, noAvailability: transferNoAvailability, serviceDate: formatServiceDate(scheduledAt) });
  const vehicleAvailabilityHint = getServiceAvailabilityHint({ effectiveCheckoutAtMs, noAvailability: vehicleNoAvailability, serviceDate: vehicleServiceDate });
  const scheduleIsValid = transferWithinStay && isTransferScheduleValid({ now: clock.getNow(), scheduledAt });
  const scheduleInvalid = showScheduleFeedback && !scheduleIsValid;
  const dateText = formatGuestDate(formatServiceDate(scheduledAt));
  const timeText = format24Hour(scheduledAt);
  const editedRequest = typeof editRequestId === 'string' && editRequestId !== ignoredTransferEditRequestId ? requests.find((request) => request.sessionRequestId === editRequestId) : undefined;
  useEffect(() => {
    if (!editedRequest || editLoaded.current === editedRequest.sessionRequestId) return;
    editLoaded.current = editedRequest.sessionRequestId;
    const timer = setTimeout(() => {
    if (editedRequest.details?.type === 'VEHICLE_REQUEST') { setActiveVehicleKey(editedRequest.details.sessionVehicleId); if (editedRequest.details.serviceDate) setVehicleServiceDate(editedRequest.details.serviceDate); setRequestedTime(editedRequest.details.requestedTime); }
      if (editedRequest.details?.type === 'TRANSFER') { setDestinationKey(editedRequest.details.destinationKey); setPickupKey(editedRequest.details.pickupKey ?? null); setScheduledAt(new Date(editedRequest.details.scheduledAtMs)); setPassengers(editedRequest.details.passengers); setTransferModalVisible(true); }
    }, 0);
    return () => clearTimeout(timer);
  }, [editedRequest]);

  useEffect(() => {
    if (!arrival || !departure) return;
    const firstAvailable = getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, arrival, departure, effectiveCheckoutAtMs);
    const nearest = isServiceDateWithinStay(vehicleServiceDate, clock.getNow().getTime(), arrival, departure)
      ? getNearestServiceTime(vehicleServiceDate, allDayTimes, clock.getNow().getTime(), requestedTime, arrival, departure, effectiveCheckoutAtMs)
      : null;
    if (nearest) return;
    const timer = setTimeout(() => {
      if (firstAvailable) {
        setVehicleServiceDate(firstAvailable);
        setRequestedTime(getNearestServiceTime(firstAvailable, allDayTimes, clock.getNow().getTime(), undefined, arrival, departure, effectiveCheckoutAtMs));
      } else if (!isServiceDateWithinStay(vehicleServiceDate, clock.getNow().getTime(), arrival, departure)) setVehicleServiceDate(departure);
    }, 0);
    return () => clearTimeout(timer);
  }, [arrival, clock, departure, effectiveCheckoutAtMs, requestedTime, vehicleServiceDate]);

  useEffect(() => {
    if (!arrival || !departure) return;
    const selectedDate = formatServiceDate(scheduledAt);
    const nearest = getNearestServiceTime(selectedDate, allDayTimes, clock.getNow().getTime(), timeText, arrival, departure, effectiveCheckoutAtMs);
    if (nearest === timeText) return;
    const firstDate = nearest ? selectedDate : getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, arrival, departure, effectiveCheckoutAtMs);
    if (!firstDate) return;
    const firstTime = nearest ?? getNearestServiceTime(firstDate, allDayTimes, clock.getNow().getTime(), undefined, arrival, departure, effectiveCheckoutAtMs);
    if (!firstTime) return;
    const [hours, minutes] = firstTime.split(':').map(Number);
    const date = parseServiceDate(firstDate);
    if (!date) return;
    const timer = setTimeout(() => setScheduledAt((current) => replaceTransferTime(replaceTransferDate(current, date), new Date(2000, 0, 1, hours, minutes))), 0);
    return () => clearTimeout(timer);
  }, [arrival, clock, departure, effectiveCheckoutAtMs, scheduledAt, timeText]);

  useEffect(() => {
    if (!stayDateWindow) return;
    const selectedDate = formatServiceDate(scheduledAt);
    const boundedDate = selectedDate < stayDateWindow.minimumDate
      ? stayDateWindow.minimumDate
      : selectedDate > stayDateWindow.maximumDate ? stayDateWindow.maximumDate : null;
    if (!boundedDate) return;
    const parsedDate = parseServiceDate(boundedDate);
    if (!parsedDate) return;
    const timer = setTimeout(() => setScheduledAt((current) => replaceTransferDate(current, parsedDate)), 0);
    return () => clearTimeout(timer);
  }, [scheduledAt, stayDateWindow]);

  useEffect(() => {
    const interval = setInterval(() => setTimeCheckVersion((current) => current + 1), 30_000);
    return () => clearInterval(interval);
  }, []);


  function submitVehicle() {
    if (lifecycle !== 'ACTIVE' || !screen || vehicleRequest.isPending || vehicleInFlight.current) return;
    const selectedVehicle = vehicles.find((item) => item.sessionVehicleId === activeVehicleKey);
    if (!selectedVehicle || selectedVehicle.status !== 'PARKED' || !requestedTime) return;
    if (!arrival || !isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: requestedTime })) {
      setVehicleScheduleError(true);
      return;
    }
    setVehicleScheduleError(false);
    vehicleInFlight.current = true;
    vehicleRequest.mutate(screen.activeVehicleKey, {
      onSuccess: () => {
        const input = { kind: 'VEHICLE_REQUEST' as const, origin: 'VALET' as const, status: 'REQUESTED' as const, summary: `${formatGuestDate(vehicleServiceDate)} · ${requestedTime} · ${vehicleDisplay(selectedVehicle)}`, title: 'Solicitar mi vehículo', details: { type: 'VEHICLE_REQUEST' as const, serviceDate: vehicleServiceDate, sessionVehicleId: selectedVehicle.sessionVehicleId, requestedTime } };
        if (editedRequest?.kind === 'VEHICLE_REQUEST') updateRequest(editedRequest.sessionRequestId, input); else addRequest(input); showServiceRequestSuccess(editedRequest ? 'UPDATED' : 'CREATED'); router.replace('/account');
      },
      onSettled: () => { vehicleInFlight.current = false; },
    });
  }

  function submitTransfer() {
    if (lifecycle !== 'ACTIVE') return;
    if (!transferWithinStay || !isTransferScheduleValid({ now: clock.getNow(), scheduledAt })) {
      setShowScheduleFeedback(true);
      return;
    }
    if (!destination || !route.data || !fare || (destination.type === 'HOTEL' && !pickup) || transferReservation.isPending || transferInFlight.current) return;
    transferInFlight.current = true;
    transferReservation.mutate({ destinationType: destination.type, destinationPlace: destination, pickupPlace: destination.type === 'HOTEL' ? pickup : null, dateText, timeText, passengers, routeEstimate: route.data, fareEstimate: fare }, {
      onSuccess: () => {
        const input = buildTransferSessionRequestInput({ destinationKey: destination.key, ...(pickup ? { pickupKey: pickup.key } : {}), scheduledAtMs: scheduledAt.getTime(), passengers, estimatedAmount: fare.estimatedPrice, fareText: fare.estimatedPriceText, summary: `${destination.displayText} · ${dateText} · ${timeText}` });
        if (editedRequest?.kind === 'TRANSFER') updateRequest(editedRequest.sessionRequestId, input); else addRequest(input); resetTransferDraft(); setTransferModalVisible(false); showServiceRequestSuccess(editedRequest ? 'UPDATED' : 'CREATED'); router.replace('/account');
      },
      onSettled: () => { transferInFlight.current = false; },
    });
  }

  function openCreateVehicle() {
    if (lifecycle !== 'ACTIVE') return;
    setEditingVehicleId(null);
    registerVehicleForm.current?.resetDraft();
    setRegisterVehicleVisible(true);
  }

  function openEditVehicle(sessionVehicleId: string) {
    if (lifecycle !== 'ACTIVE') return;
    const vehicle = vehicles.find((item) => item.sessionVehicleId === sessionVehicleId);
    if (!vehicle) return;
    setEditingVehicleId(sessionVehicleId);
    registerVehicleForm.current?.loadDraft(vehicle);
    setRegisterVehicleVisible(true);
  }

  function resetTransferDraft() {
    setDestinationKey(null);
    setPickupKey(null);
    setScheduledAt(getMinimumTransferDateTime(clock.getNow()));
    setDatePickerVisible(false);
    setTimePickerVisible(false);
    setSelectorTarget(null);
    setShowScheduleFeedback(false);
    setPassengers(screen?.transfer.defaultPassengers ?? 2);
    setMapError(false);
    transferReservation.reset();
    transferInFlight.current = false;
    editLoaded.current = null;
  }

  function openCreateTransfer() {
    if (lifecycle !== 'ACTIVE') return;
    setIgnoredTransferEditRequestId(typeof editRequestId === 'string' ? editRequestId : null);
    resetTransferDraft();
    setTransferModalVisible(true);
  }

  function updateSchedule(nextValue: Date) {
    setScheduledAt(nextValue);
    setShowScheduleFeedback(true);
  }

  function onTransferDateConfirm(value: string) {
    setDatePickerVisible(false);
    const selectedDate = parseServiceDate(value);
    if (selectedDate) updateSchedule(replaceTransferDate(scheduledAt, selectedDate));
  }

  function onTimeWheelConfirm(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return;
    updateSchedule(replaceTransferTime(scheduledAt, new Date(2000, 0, 1, hours, minutes)));
    setTimePickerVisible(false);
  }

  async function openExternalMap() {
    if (!origin || !destination || !route.data) return;
    setMapError(false);
    if (!await mapService.openRoute(origin, destination)) setMapError(true);
  }

  if (isCheckedOut) return <View style={valetStyles.screen} testID="valet-stay-completed"><GuestRootHeader title="Valet" /><View style={[valetStyles.content, valetStyles.stateContent]}><StateCard body="Los servicios de estancia ya no están disponibles." testID="valet-creation-blocked" title="Estancia finalizada" /></View><GuestNavigationShell /></View>;
  if (lifecycle === 'CHECKOUT_DUE') return <View style={valetStyles.screen} testID="valet-screen"><GuestRootHeader title="Valet" /><View style={[valetStyles.content, valetStyles.stateContent]}><GuestCheckoutDueState actionTestID="valet-checkout-due-action" testID="valet-checkout-due" /></View><GuestNavigationShell /></View>;
  if (valetState.kind === 'loading') return <View style={valetStyles.screen}><GuestRootHeader title="Valet" /><View style={[valetStyles.content, valetStyles.stateContent]} testID="valet-screen-loading"><Text style={valetStyles.title}>Cargando transporte y valet</Text></View><GuestNavigationShell /></View>;
  if (valetState.kind === 'offline') return <View style={valetStyles.screen}><GuestRootHeader title="Valet" /><View style={[valetStyles.content, valetStyles.stateContent]}><StateCard body="Conéctate a internet para ver transporte y valet." offline onRetry={() => void valetQuery.refetch()} testID="valet-screen-offline" title="Sin conexión" /></View><GuestNavigationShell /></View>;
  if (valetState.kind === 'error') return <View style={valetStyles.screen}><GuestRootHeader title="Valet" /><View style={[valetStyles.content, valetStyles.stateContent]}><StateCard body="Intenta nuevamente." onRetry={() => void valetQuery.refetch()} testID="valet-screen-error" title="No pudimos cargar transporte y valet" /></View><GuestNavigationShell /></View>;
  if (!screen || !hotel || !destination || valetState.kind === 'empty') return null;
  const vehicle = vehicles.find((item) => item.sessionVehicleId === activeVehicleKey) ?? null;
  const vehicleOffline = vehicleRequest.isError && vehicleRequest.error instanceof NetworkError;
  const vehicleError = vehicleRequest.isError && !vehicleOffline;


  return <View style={valetStyles.screen} testID="valet-screen">
    <GuestRootHeader title="Valet" />
    <ScrollView contentContainerStyle={valetStyles.content} style={valetStyles.scroll}>
      <Text style={valetStyles.subtitle}>Mis vehículos y transporte durante tu estadía</Text>
      <View style={valetStyles.card} testID="valet-vehicles-section"><Text style={valetStyles.cardHeading}>Mis vehículos</Text>{vehicles.length === 0 ? <Text style={valetStyles.mutedText}>Aún no tienes vehículos registrados.</Text> : vehicles.map((item) => <View key={item.sessionVehicleId} style={valetStyles.detailList}><Text style={valetStyles.bodyText}>{vehicleDisplay(item)}</Text><Text style={valetStyles.mutedText}>{formatVehiclePlate(item.platePrefix, item.plateBody)} · {vehicleStatusText(item.status)}</Text><Pressable accessibilityLabel={`Editar ${vehicleDisplay(item)}`} accessibilityRole="button" onPress={() => openEditVehicle(item.sessionVehicleId)} style={valetStyles.secondaryButton} testID={`valet-edit-${item.sessionVehicleId}`}><View accessible={false} testID={`valet-edit-${item.sessionVehicleId}-icon`}><SymbolView accessibilityElementsHidden name={guestFeatureIcons.vehicle} size={20} tintColor={tokens.color.brand} /></View><Text style={valetStyles.secondaryButtonLabel}>Editar vehículo</Text></Pressable>{item.status === 'WITH_GUEST' ? <Pressable accessibilityRole="button" onPress={() => { if (lifecycle === 'ACTIVE') setVehicleStatus(item.sessionVehicleId, 'PARKED'); }} style={valetStyles.secondaryButton} testID={`valet-return-${item.sessionVehicleId}`}><Text style={valetStyles.secondaryButtonLabel}>Entregar al valet</Text></Pressable> : null}</View>)}<Pressable accessibilityRole="button" onPress={openCreateVehicle} style={valetStyles.secondaryButton} testID="valet-register-vehicle"><View accessible={false} testID="valet-register-vehicle-icon"><SymbolView accessibilityElementsHidden name={guestFeatureIcons.vehicle} size={20} tintColor={tokens.color.brand} /></View><Text style={valetStyles.secondaryButtonLabel}>Registrar vehículo</Text></Pressable></View>
      <Text style={valetStyles.cardHeading}>Servicios</Text>
      <Pressable accessibilityRole="button" onPress={() => vehicles.length ? setVehicleModalVisible(true) : openCreateVehicle()} style={valetStyles.card} testID="valet-vehicle-card"><View accessible={false} testID="valet-vehicle-card-icon"><SymbolView accessibilityElementsHidden name={guestFeatureIcons.vehicle} size={24} tintColor={tokens.color.brand} /></View><Text style={valetStyles.cardHeading}>Solicitar mi vehículo</Text><Text style={valetStyles.mutedText}>{vehicles.length ? 'Selecciona un vehículo en parqueo.' : 'Registra un vehículo antes de solicitarlo.'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={openCreateTransfer} style={valetStyles.card} testID="valet-transfer-card"><View accessible={false} testID="valet-transfer-card-icon"><SymbolView accessibilityElementsHidden name={guestFeatureIcons.transfer} size={24} tintColor={tokens.color.brand} /></View><Text style={valetStyles.cardHeading}>Solicitar traslado</Text><Text style={valetStyles.bodyText}>{destination.displayText}</Text><Text style={valetStyles.bodyText}>{dateText} · {timeText}</Text></Pressable>
      <Text style={valetStyles.mutedText}>{screen.folioNoticeText}</Text>
      {vehicleOffline ? <StateCard body="Conéctate a internet para solicitar tu vehículo." offline onRetry={submitVehicle} testID="valet-request-offline" title="Sin conexión" /> : null}
      {vehicleError ? <StateCard body="Intenta nuevamente." onRetry={submitVehicle} testID="valet-request-error" title="No pudimos solicitar tu vehículo" /> : null}
    </ScrollView>
    <GuestNavigationShell />
    <VehicleModal activeKey={vehicle?.sessionVehicleId ?? ''} noAvailability={vehicleNoAvailability} onClose={() => setVehicleModalVisible(false)} onOpenDatePicker={() => setVehicleDatePickerVisible(true)} onOpenTimePicker={() => { setVehicleScheduleError(false); setVehicleTimePickerVisible(true); }} onSelect={setActiveVehicleKey} onSubmit={submitVehicle} requestedTime={requestedTime} requestedTimeAllowed={arrival !== null && requestedTime !== null && isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: requestedTime })} scheduleError={vehicleScheduleError} serviceDate={vehicleServiceDate} submitting={vehicleRequest.isPending} vehicles={vehicles} visible={vehicleModalVisible} />
    <RegisterVehicleModal editing={editingVehicleId !== null} ref={registerVehicleForm} onClose={() => { setEditingVehicleId(null); setRegisterVehicleVisible(false); }} onRegister={(input) => lifecycle === 'ACTIVE' && (editingVehicleId ? updateVehicle(editingVehicleId, input) : addVehicle(input))} vehicles={editingVehicleId ? vehicles.filter((vehicle) => vehicle.sessionVehicleId !== editingVehicleId) : vehicles} visible={registerVehicleVisible} />
    <TransferModal dateText={dateText} destination={destination} fare={fare} mapError={mapError} noAvailability={transferNoAvailability} onClose={() => setTransferModalVisible(false)} onOpenDatePicker={() => setDatePickerVisible(true)} onOpenMap={() => { void openExternalMap(); }} onOpenSelector={setSelectorTarget} onOpenTimePicker={() => setTimePickerVisible(true)} onPassengers={(value) => setPassengers(Math.max(1, Math.min(3, value)))} onReserve={submitTransfer} onRetryRoute={() => void route.refetch()} onReset={() => { setIgnoredTransferEditRequestId(typeof editRequestId === 'string' ? editRequestId : null); resetTransferDraft(); }} origin={origin} passengers={passengers} pickup={pickup} reservation={transferReservation} route={route} scheduleInvalid={scheduleInvalid} scheduleIsValid={scheduleIsValid} timeText={timeText} visible={transferModalVisible} />
    <PlaceSelector onClose={() => setSelectorTarget(null)} onSelect={(place) => { setMapError(false); if (selectorTarget === 'destination') { setDestinationKey(place.key); setPickupKey(null); } else { setPickupKey(place.key); } setSelectorTarget(null); }} places={screen.places} selectedKey={selectorTarget === 'pickup' ? pickup?.key ?? null : destination.key} target={selectorTarget} visible={selectorTarget !== null} />
    <ServiceDatePicker maximumDate={stayDateWindow ? parseServiceDate(stayDateWindow.maximumDate) ?? undefined : undefined} minimumDate={stayDateWindow ? parseServiceDate(stayDateWindow.minimumDate) ?? startOfTransferDay(clock.getNow()) : startOfTransferDay(clock.getNow())} onCancel={() => setDatePickerVisible(false)} onConfirm={onTransferDateConfirm} testID="transfer-date-picker" value={formatServiceDate(scheduledAt)} visible={datePickerVisible && stayDateWindow !== null} />
    <TimeWheelPicker availabilityHint={transferAvailabilityHint} isValueDisabled={(value) => arrival === null || !isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: formatServiceDate(scheduledAt), startTime: value })} mode="time" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { if (arrival !== null && isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: formatServiceDate(scheduledAt), startTime: value })) onTimeWheelConfirm(value); }} testID="transfer-time-picker" title="Elegir hora" value={timeText} visible={timePickerVisible && !transferNoAvailability} />
    <ServiceDatePicker maximumDate={stayDateWindow ? parseServiceDate(stayDateWindow.maximumDate) ?? undefined : undefined} minimumDate={stayDateWindow ? parseServiceDate(stayDateWindow.minimumDate) ?? startOfTransferDay(clock.getNow()) : startOfTransferDay(clock.getNow())} onCancel={() => setVehicleDatePickerVisible(false)} onConfirm={(nextDate) => { setVehicleDatePickerVisible(false); setVehicleServiceDate(nextDate); setRequestedTime(arrival && departure ? getNearestServiceTime(nextDate, allDayTimes, clock.getNow().getTime(), requestedTime, arrival, departure, effectiveCheckoutAtMs) : null); }} testID="valet-request-date-picker" value={vehicleServiceDate} visible={vehicleDatePickerVisible && stayDateWindow !== null} />
    <TimeWheelPicker availabilityHint={vehicleAvailabilityHint} isValueDisabled={(value) => arrival === null || !isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: value })} mode="time" onCancel={() => setVehicleTimePickerVisible(false)} onConfirm={(value) => { if (arrival !== null && isServiceWithinEffectiveCheckout({ arrival, effectiveCheckoutAtMs, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: value })) { setVehicleScheduleError(false); setRequestedTime(value); } setVehicleTimePickerVisible(false); }} testID="valet-request-time-picker-wheel" title="Elegir hora de solicitud" value={requestedTime as string} visible={vehicleTimePickerVisible && requestedTime !== null} />
  </View>;
}

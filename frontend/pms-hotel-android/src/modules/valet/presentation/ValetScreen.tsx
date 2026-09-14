import { useRef, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestNavigationShell } from '@/modules/navigation';
import {
  GoogleMapsLinkingService,
  type ExternalMapService,
} from '@/modules/valet/data/services/GoogleMapsLinkingService';
import { type TransferRouteService } from '@/modules/valet/data/services/TransferRouteService';
import { type ValetService } from '@/modules/valet/data/services/ValetService';
import { type TransferPlace, type ValetVehicle } from '@/modules/valet/domain/models/ValetScreen';
import { deviceClock, type Clock } from '@/modules/valet/domain/services/Clock';
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
import { deriveRemoteState } from '@/state/remoteState';
import { TimeWheelPicker } from '@/shared/components';

const defaultMapService = new GoogleMapsLinkingService();

export interface ValetScreenProps {
  service?: ValetService;
  routeService?: TransferRouteService;
  mapService?: ExternalMapService;
  clock?: Clock;
}

type SelectorTarget = 'destination' | 'pickup' | null;

function vehicleDisplay(vehicle: ValetVehicle): string {
  return `${vehicle.displayText} · ${vehicle.colorText}`;
}

function format24Hour(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function StateCard({
  body,
  offline = false,
  onRetry,
  success = false,
  testID,
  title,
}: {
  body: string;
  offline?: boolean;
  onRetry?: () => void;
  success?: boolean;
  testID: string;
  title: string;
}) {
  return (
    <View style={[valetStyles.stateCard, offline && valetStyles.offlineStateCard, success && valetStyles.successStateCard]} testID={testID}>
      <Text style={valetStyles.stateTitle}>{title}</Text>
      <Text style={valetStyles.stateBody}>{body}</Text>
      {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={valetStyles.button}><Text style={valetStyles.buttonLabel}>Reintentar</Text></Pressable> : null}
    </View>
  );
}

function VehicleModal({
  activeKey,
  onClose,
  onSelect,
  vehicles,
  visible,
}: {
  activeKey: string;
  onClose: () => void;
  onSelect: (key: string) => void;
  vehicles: readonly ValetVehicle[];
  visible: boolean;
}) {
  const active = vehicles.find((vehicle) => vehicle.key === activeKey);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={valetStyles.modalBackdrop}>
        <View accessibilityViewIsModal style={valetStyles.modalSheet} testID="valet-vehicle-modal">
          <Text style={valetStyles.cardHeading}>Mi vehículo</Text>
          {active ? <View style={valetStyles.detailList}>
            <Text style={valetStyles.bodyText}>{vehicleDisplay(active)}</Text>
            <Text style={valetStyles.mutedText}>Placa: {active.plateText}</Text>
            <Text style={valetStyles.mutedText}>{active.registrationText}</Text>
            <Text style={valetStyles.mutedText}>{active.parkingDetailText}</Text>
            <Text style={valetStyles.mutedText}>Tiempo estimado: {active.estimatedDeliveryText}</Text>
          </View> : null}
          <Text style={valetStyles.actionHeading}>Vehículos disponibles</Text>
          {vehicles.map((vehicle) => <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: vehicle.key === activeKey }}
            key={vehicle.key}
            onPress={() => onSelect(vehicle.key)}
            style={[valetStyles.vehicleOption, vehicle.key === activeKey && valetStyles.vehicleOptionSelected]}
            testID={`valet-vehicle-option-${vehicle.key}`}
          ><Text style={valetStyles.bodyText}>{vehicleDisplay(vehicle)}</Text></Pressable>)}
          <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cerrar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PlaceSelector({
  onClose,
  onSelect,
  places,
  selectedKey,
  target,
  visible,
}: {
  onClose: () => void;
  onSelect: (place: TransferPlace) => void;
  places: readonly TransferPlace[];
  selectedKey: string | null;
  target: SelectorTarget;
  visible: boolean;
}) {
  const choices = target === 'pickup' ? places.filter((place) => place.type !== 'HOTEL') : places;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={valetStyles.modalBackdrop}>
        <View accessibilityViewIsModal style={valetStyles.modalSheet} testID="transfer-place-selector">
          <Text style={valetStyles.cardHeading}>{target === 'pickup' ? 'Punto de recogida' : 'Destino'}</Text>
          {choices.map((place) => <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: place.key === selectedKey }}
            key={place.key}
            onPress={() => onSelect(place)}
            style={[valetStyles.vehicleOption, place.key === selectedKey && valetStyles.vehicleOptionSelected]}
            testID={`transfer-place-option-${place.key}`}
          ><Text style={valetStyles.bodyText}>{place.displayText}</Text></Pressable>)}
          <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cerrar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PlaceField({ label, onSelect, place, testID }: {
  label: string;
  onSelect: () => void;
  place: TransferPlace | null;
  testID: string;
}) {
  return <>
    <Text style={valetStyles.inputLabel}>{label}</Text>
    <View style={valetStyles.locationField}>
      <TextInput accessibilityLabel={label} editable={false} placeholder={label === 'Punto de recogida' ? 'Selecciona dónde deseas que te recojan' : 'Selecciona destino'} style={valetStyles.locationInput} value={place?.displayText ?? ''} />
      <Pressable accessibilityHint={`Selecciona ${label.toLowerCase()}.`} accessibilityLabel={`Seleccionar ${label.toLowerCase()}`} accessibilityRole="button" onPress={onSelect} style={valetStyles.locationButton} testID={testID}><Text style={valetStyles.locationIcon}>📍</Text></Pressable>
    </View>
  </>;
}

function TransferModal({
  dateText,
  destination,
  fare,
  mapError,
  onClose,
  onOpenMap,
  onOpenDatePicker,
  onOpenSelector,
  onOpenTimePicker,
  onPassengers,
  onReserve,
  onRetryRoute,
  onReset,
  origin,
  passengers,
  pickup,
  reservation,
  route,
  scheduleInvalid,
  scheduleIsValid,
  timeText,
  visible,
}: {
  dateText: string;
  destination: TransferPlace | null;
  fare: ReturnType<typeof calculateTransferFare> | null;
  mapError: boolean;
  onClose: () => void;
  onOpenMap: () => void;
  onOpenDatePicker: () => void;
  onOpenSelector: (target: Exclude<SelectorTarget, null>) => void;
  onOpenTimePicker: () => void;
  onPassengers: (value: number) => void;
  onReserve: () => void;
  onRetryRoute: () => void;
  onReset: () => void;
  origin: TransferPlace | null;
  passengers: number;
  pickup: TransferPlace | null;
  reservation: ReturnType<typeof useReserveTransfer>;
  route: ReturnType<typeof useTransferRouteEstimate>;
  scheduleInvalid: boolean;
  scheduleIsValid: boolean;
  timeText: string;
  visible: boolean;
}) {
  const destinationIsHotel = destination?.type === 'HOTEL';
  const routeOffline = route.isError && route.error instanceof NetworkError;
  const routeError = route.isError && !routeOffline;
  const reserveOffline = reservation.isError && reservation.error instanceof NetworkError;
  const reserveError = reservation.isError && !reserveOffline;
  const canReserve = Boolean(destination && (!destinationIsHotel || pickup) && route.data && fare && scheduleIsValid && !route.isPending && !reservation.isPending);
  const canViewMap = Boolean(origin && destination && route.data);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={valetStyles.modalBackdrop}>
        <ScrollView contentContainerStyle={valetStyles.modalScroll}>
          <View accessibilityViewIsModal style={valetStyles.modalSheet} testID="valet-transfer-modal">
            {reservation.isSuccess ? <View style={valetStyles.detailList} testID="valet-transfer-success">
              <Text style={valetStyles.stateTitle}>✓ {reservation.data.confirmationText}</Text>
              <Text style={valetStyles.inputLabel}>Destino</Text>
              <Text style={valetStyles.bodyText}>{destination?.displayText}</Text>
              {destinationIsHotel && pickup ? <><Text style={valetStyles.inputLabel}>Punto de recogida</Text><Text style={valetStyles.bodyText}>{pickup.displayText}</Text></> : null}
              <Text style={valetStyles.bodyText}>{dateText} · {timeText}</Text>
              <Text style={valetStyles.bodyText}>{passengers} pasajeros</Text>
              {route.data && fare ? <Text style={valetStyles.bodyText}>{route.data.distanceText} · {route.data.durationText} · Estimado {fare.estimatedPriceText}</Text> : null}
              <Pressable accessibilityRole="button" onPress={onReset} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Configurar traslado</Text></Pressable>
            </View> : <>
              <Text style={valetStyles.cardHeading}>Traslado</Text>
              <PlaceField label="Destino" onSelect={() => onOpenSelector('destination')} place={destination} testID="transfer-destination-selector" />
              {destinationIsHotel ? <PlaceField label="Punto de recogida" onSelect={() => onOpenSelector('pickup')} place={pickup} testID="transfer-pickup-selector" /> : null}
              {destinationIsHotel && !pickup ? <Text accessibilityLiveRegion="polite" style={valetStyles.validationText}>Selecciona un punto de recogida para volver al Hotel.</Text> : null}
              <Text style={valetStyles.inputLabel}>Fecha</Text>
              <Pressable accessibilityLabel="Seleccionar fecha del traslado" accessibilityRole="button" onPress={onOpenDatePicker} style={valetStyles.dateTimeButton} testID="transfer-date-picker-button"><Text style={valetStyles.bodyText}>📅 {dateText}</Text></Pressable>
              <Text style={valetStyles.inputLabel}>Hora</Text>
              <Pressable accessibilityLabel="Seleccionar hora del traslado" accessibilityRole="button" onPress={onOpenTimePicker} style={valetStyles.dateTimeButton} testID="transfer-time-picker-button"><Text style={valetStyles.bodyText}>🕒 {timeText}</Text></Pressable>
              {scheduleInvalid ? <Text accessibilityLiveRegion="polite" style={valetStyles.validationText} testID="transfer-schedule-error">Selecciona una hora con al menos 30 min de anticipación.</Text> : null}
              <Text style={valetStyles.inputLabel}>Pasajeros</Text>
              <View style={valetStyles.stepper}>
                <Pressable accessibilityLabel="Reducir pasajeros" accessibilityRole="button" disabled={passengers <= 1} onPress={() => onPassengers(passengers - 1)} style={valetStyles.stepperButton} testID="transfer-passengers-decrement"><Text style={valetStyles.stepperLabel}>−</Text></Pressable>
                <Text style={valetStyles.bodyText} testID="transfer-passengers-value">{passengers}</Text>
                <Pressable accessibilityLabel="Aumentar pasajeros" accessibilityRole="button" disabled={passengers >= 3} onPress={() => onPassengers(passengers + 1)} style={valetStyles.stepperButton} testID="transfer-passengers-increment"><Text style={valetStyles.stepperLabel}>+</Text></Pressable>
              </View>
              {route.isPending ? <Text style={valetStyles.mutedText} testID="transfer-route-loading">Calculando ruta…</Text> : null}
              {route.data && fare ? <View style={valetStyles.estimateCard} testID="transfer-route-estimate">
                <Text style={valetStyles.mutedText}>Distancia</Text><Text style={valetStyles.bodyText}>{route.data.distanceText}</Text>
                <Text style={valetStyles.mutedText}>Tiempo estimado</Text><Text style={valetStyles.bodyText}>{route.data.durationText}</Text>
                <Text style={valetStyles.mutedText}>Precio estimado</Text><Text style={valetStyles.actionHeading}>{fare.estimatedPriceText}</Text>
                {canViewMap ? <Pressable accessibilityLabel="Ver ruta en Maps" accessibilityRole="button" onPress={onOpenMap} style={valetStyles.mapButton} testID="transfer-view-route-maps"><Text style={valetStyles.mapButtonLabel}>Ver ruta en Maps</Text></Pressable> : null}
                {mapError ? <Text accessibilityLiveRegion="polite" style={valetStyles.validationText} testID="transfer-maps-error">No pudimos abrir Maps. Puedes intentar nuevamente.</Text> : null}
              </View> : null}
              {!route.isPending && !route.data && !routeError && !routeOffline ? <Text style={valetStyles.mutedText}>Selecciona una ubicación para calcular la tarifa.</Text> : null}
              {routeOffline ? <StateCard body="Conéctate a internet para calcular la tarifa." offline onRetry={onRetryRoute} testID="transfer-route-offline" title="Sin conexión" /> : null}
              {routeError ? <StateCard body="Intenta nuevamente." onRetry={onRetryRoute} testID="transfer-route-error" title="No pudimos calcular la ruta" /> : null}
              {reserveOffline ? <StateCard body="Conéctate a internet para reservar el traslado." offline onRetry={onReserve} testID="valet-transfer-offline" title="Sin conexión" /> : null}
              {reserveError ? <StateCard body="Intenta nuevamente." onRetry={onReserve} testID="valet-transfer-error" title="No pudimos reservar el traslado" /> : null}
              {!reserveError && !reserveOffline ? <Pressable accessibilityLabel={reservation.isPending ? 'Reservando traslado' : 'Reservar traslado'} accessibilityRole="button" accessibilityState={{ busy: reservation.isPending, disabled: !canReserve }} disabled={!canReserve} onPress={onReserve} style={[valetStyles.button, !canReserve && valetStyles.buttonDisabled]} testID="transfer-reserve-button"><Text style={valetStyles.buttonLabel}>{reservation.isPending ? 'Reservando...' : 'Reservar traslado'}</Text></Pressable> : null}
            </>}
            <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cerrar</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ValetScreen({ clock = deviceClock, mapService = defaultMapService, routeService, service }: ValetScreenProps) {
  const valetQuery = useValetScreen(service);
  const valetState = deriveRemoteState(valetQuery, () => false);
  const [activeVehicleKey, setActiveVehicleKey] = useState<string | null>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
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
  const vehicleRequest = useRequestValetVehicle(service);
  const transferReservation = useReserveTransfer(service);
  const vehicleInFlight = useRef(false);
  const transferInFlight = useRef(false);
  const screen = valetState.kind === 'success' ? valetState.data : null;
  const hotel = screen?.places.find((place) => place.type === 'HOTEL') ?? null;
  const destination = screen?.places.find((place) => place.key === (destinationKey ?? screen.transfer.defaultDestinationKey)) ?? null;
  const pickup = screen?.places.find((place) => place.key === pickupKey) ?? null;
  const origin = destination?.type === 'HOTEL' ? pickup : hotel;
  const route = useTransferRouteEstimate(origin?.key ?? null, destination?.key ?? null, routeService);
  const fare = route.data ? calculateTransferFare(route.data) : null;
  const scheduleIsValid = isTransferScheduleValid({ now: clock.getNow(), scheduledAt });
  const scheduleInvalid = showScheduleFeedback && !scheduleIsValid;
  const dateText = scheduledAt.toLocaleDateString();
  const timeText = format24Hour(scheduledAt);


  function submitVehicle() {
    if (!screen || vehicleRequest.isPending || vehicleInFlight.current) return;
    vehicleInFlight.current = true;
    vehicleRequest.mutate(activeVehicleKey ?? screen.activeVehicleKey, { onSettled: () => { vehicleInFlight.current = false; } });
  }

  function submitTransfer() {
    if (!isTransferScheduleValid({ now: clock.getNow(), scheduledAt })) {
      setShowScheduleFeedback(true);
      return;
    }
    if (!destination || !route.data || !fare || (destination.type === 'HOTEL' && !pickup) || transferReservation.isPending || transferInFlight.current) return;
    transferInFlight.current = true;
    transferReservation.mutate({ destinationType: destination.type, destinationPlace: destination, pickupPlace: destination.type === 'HOTEL' ? pickup : null, dateText, timeText, passengers, routeEstimate: route.data, fareEstimate: fare }, { onSettled: () => { transferInFlight.current = false; } });
  }

  function updateSchedule(nextValue: Date) {
    setScheduledAt(nextValue);
    setShowScheduleFeedback(true);
  }

  function onDatePickerChange(event: DateTimePickerEvent, selectedValue?: Date) {
    setDatePickerVisible(false);
    if (event.type === 'dismissed' || !selectedValue) return;
    updateSchedule(replaceTransferDate(scheduledAt, selectedValue));
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

  if (valetState.kind === 'loading') return <View style={valetStyles.screen}><View style={[valetStyles.content, valetStyles.stateContent]} testID="valet-screen-loading"><Text style={valetStyles.title}>Cargando transporte y valet</Text></View><GuestNavigationShell /></View>;
  if (valetState.kind === 'offline') return <View style={valetStyles.screen}><View style={[valetStyles.content, valetStyles.stateContent]}><StateCard body="Conéctate a internet para ver transporte y valet." offline onRetry={() => void valetQuery.refetch()} testID="valet-screen-offline" title="Sin conexión" /></View><GuestNavigationShell /></View>;
  if (valetState.kind === 'error') return <View style={valetStyles.screen}><View style={[valetStyles.content, valetStyles.stateContent]}><StateCard body="Intenta nuevamente." onRetry={() => void valetQuery.refetch()} testID="valet-screen-error" title="No pudimos cargar transporte y valet" /></View><GuestNavigationShell /></View>;
  if (!screen || !hotel || !destination || valetState.kind === 'empty') return null;
  const vehicle = screen.vehicles.find((item) => item.key === (activeVehicleKey ?? screen.activeVehicleKey));
  if (!vehicle) return null;
  const vehicleOffline = vehicleRequest.isError && vehicleRequest.error instanceof NetworkError;
  const vehicleError = vehicleRequest.isError && !vehicleOffline;

  if (vehicleRequest.isSuccess) return <View style={valetStyles.screen} testID="valet-request-success-screen"><ScrollView contentContainerStyle={[valetStyles.content, valetStyles.successContent]} style={valetStyles.scroll}><StateCard body="Tu vehículo está siendo preparado." success testID="valet-request-success" title="✓ Solicitud enviada" /><Text style={valetStyles.bodyText}>{vehicleDisplay(vehicle)}</Text><Text style={valetStyles.mutedText}>Tiempo estimado · {vehicle.estimatedDeliveryText}</Text><Text style={valetStyles.mutedText}>Solicitud {vehicleRequest.data.requestReferenceText}</Text></ScrollView><GuestNavigationShell /></View>;

  return <View style={valetStyles.screen} testID="valet-screen">
    <ScrollView contentContainerStyle={valetStyles.content} style={valetStyles.scroll}>
      <Text style={valetStyles.title}>Transporte y valet</Text>
      <Text style={valetStyles.subtitle}>Movilidad durante tu estadía</Text>
      <Pressable accessibilityRole="button" onPress={() => setVehicleModalVisible(true)} style={valetStyles.card} testID="valet-vehicle-card"><Text style={valetStyles.cardHeading}>Mi vehículo</Text><Text style={valetStyles.bodyText}>{vehicleDisplay(vehicle)}</Text><Text style={valetStyles.mutedText}>{vehicle.registrationText}</Text><Text style={valetStyles.bodyText}>{vehicle.parkingDetailText}</Text></Pressable>
      <View style={[valetStyles.card, valetStyles.etaCard]}><Text style={valetStyles.actionHeading}>Solicitar mi vehículo</Text><Text style={valetStyles.mutedText}>Tiempo estimado de entrega: {vehicle.estimatedDeliveryText}</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setTransferModalVisible(true)} style={valetStyles.card} testID="valet-transfer-card"><Text style={valetStyles.cardHeading}>Traslado</Text><Text style={valetStyles.bodyText}>{destination.displayText}</Text><Text style={valetStyles.bodyText}>{dateText} · {timeText}</Text><Text style={valetStyles.bodyText}>Hasta {passengers} pasajeros</Text>{fare ? <Text style={valetStyles.actionHeading}>Estimado {fare.estimatedPriceText}</Text> : <Text style={valetStyles.mutedText}>Selecciona una ubicación para calcular la tarifa.</Text>}</Pressable>
      <Text style={valetStyles.mutedText}>{screen.folioNoticeText}</Text>
      {vehicleOffline ? <StateCard body="Conéctate a internet para solicitar tu vehículo." offline onRetry={submitVehicle} testID="valet-request-offline" title="Sin conexión" /> : null}
      {vehicleError ? <StateCard body="Intenta nuevamente." onRetry={submitVehicle} testID="valet-request-error" title="No pudimos solicitar tu vehículo" /> : null}
      {!vehicleOffline && !vehicleError ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: vehicleRequest.isPending }} disabled={vehicleRequest.isPending} onPress={submitVehicle} style={[valetStyles.button, vehicleRequest.isPending && valetStyles.buttonDisabled]} testID="valet-request-button"><Text style={valetStyles.buttonLabel}>{vehicleRequest.isPending ? 'Solicitando...' : 'Solicitar ahora'}</Text></Pressable> : null}
    </ScrollView>
    <GuestNavigationShell />
    <VehicleModal activeKey={vehicle.key} onClose={() => setVehicleModalVisible(false)} onSelect={(key) => { setActiveVehicleKey(key); setVehicleModalVisible(false); }} vehicles={screen.vehicles} visible={vehicleModalVisible} />
    <TransferModal dateText={dateText} destination={destination} fare={fare} mapError={mapError} onClose={() => setTransferModalVisible(false)} onOpenDatePicker={() => setDatePickerVisible(true)} onOpenMap={() => { void openExternalMap(); }} onOpenSelector={setSelectorTarget} onOpenTimePicker={() => setTimePickerVisible(true)} onPassengers={(value) => setPassengers(Math.max(1, Math.min(3, value)))} onReserve={submitTransfer} onRetryRoute={() => void route.refetch()} onReset={() => { transferReservation.reset(); transferInFlight.current = false; setMapError(false); }} origin={origin} passengers={passengers} pickup={pickup} reservation={transferReservation} route={route} scheduleInvalid={scheduleInvalid} scheduleIsValid={scheduleIsValid} timeText={timeText} visible={transferModalVisible} />
    <PlaceSelector onClose={() => setSelectorTarget(null)} onSelect={(place) => { setMapError(false); if (selectorTarget === 'destination') { setDestinationKey(place.key); setPickupKey(null); } else { setPickupKey(place.key); } setSelectorTarget(null); }} places={screen.places} selectedKey={selectorTarget === 'pickup' ? pickup?.key ?? null : destination.key} target={selectorTarget} visible={selectorTarget !== null} />
    {datePickerVisible ? <DateTimePicker display="default" minimumDate={startOfTransferDay(clock.getNow())} mode="date" onChange={onDatePickerChange} testID="transfer-date-picker" value={scheduledAt} /> : null}
    <TimeWheelPicker mode="time" onCancel={() => setTimePickerVisible(false)} onConfirm={onTimeWheelConfirm} testID="transfer-time-picker" title="Elegir hora" value={timeText} visible={timePickerVisible} />
  </View>;
}

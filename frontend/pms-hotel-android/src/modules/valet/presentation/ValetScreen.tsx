import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestNavigationShell } from '@/modules/navigation';
import { formatServiceDate, formatServiceDateLabel, getFirstAvailableServiceDate, getInitialServiceDate, getNearestServiceTime, isServiceDateWithinStay, isServiceWithinStayWindow, parseServiceDate, useSessionServiceRequests } from '@/modules/service-requests';
import {
  GoogleMapsLinkingService,
  type ExternalMapService,
} from '@/modules/valet/data/services/GoogleMapsLinkingService';
import { type TransferRouteService } from '@/modules/valet/data/services/TransferRouteService';
import { type ValetService } from '@/modules/valet/data/services/ValetService';
import { type TransferPlace } from '@/modules/valet/domain/models/ValetScreen';
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
import { useSessionVehicles } from '@/modules/valet/session/SessionVehiclesProvider';
import { type SessionVehicle } from '@/modules/valet/session/SessionVehicle';
import { formatVehiclePlate, hasDuplicateVehiclePlate, sanitizeVehiclePlateBodyInput, validateRequiredVehicleText, validateVehiclePlateBody, vehicleInputLimits, vehiclePlatePrefixes } from '@/modules/valet/session/vehicleValidation';
import { deriveRemoteState } from '@/state/remoteState';
import { ServiceDatePicker, TimeWheelPicker } from '@/shared/components';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';

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

function vehicleDisplay(vehicle: SessionVehicle): string {
  return `${vehicle.make} ${vehicle.model}${vehicle.color ? ` · ${vehicle.color}` : ''}`;
}

function vehicleStatusText(status: SessionVehicle['status']): string { return status === 'PARKED' ? 'En parqueo' : 'Conmigo'; }

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
  onOpenTimePicker,
  onSelect,
  onSubmit,
  onOpenDatePicker,
  noAvailability,
  requestedTime,
  requestedTimeAllowed,
  scheduleError,
  serviceDate,
  submitting,
  vehicles,
  visible,
}: {
  activeKey: string;
  onClose: () => void;
  onOpenTimePicker: () => void;
  onSelect: (key: string) => void;
  onSubmit: () => void;
  onOpenDatePicker: () => void;
  noAvailability: boolean;
  requestedTime: string | null;
  requestedTimeAllowed: boolean;
  scheduleError: boolean;
  serviceDate: string;
  submitting: boolean;
  vehicles: readonly SessionVehicle[];
  visible: boolean;
}) {
  const active = vehicles.find((vehicle) => vehicle.sessionVehicleId === activeKey);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={valetStyles.modalBackdrop}>
        <View accessibilityViewIsModal style={valetStyles.modalSheet} testID="valet-vehicle-modal">
          <Text style={valetStyles.cardHeading}>Solicitar mi vehículo</Text>
          {active ? <View style={valetStyles.detailList} testID="valet-vehicle-configuration">
            <Text style={valetStyles.bodyText}>{vehicleDisplay(active)}</Text>
            <Text style={valetStyles.mutedText}>Placa: {formatVehiclePlate(active.platePrefix, active.plateBody)}</Text>
            <Text style={valetStyles.mutedText}>{vehicleStatusText(active.status)}</Text>
            <Pressable accessibilityRole="button" onPress={() => onSelect('')} style={valetStyles.secondaryButton} testID="valet-change-vehicle"><Text style={valetStyles.secondaryButtonLabel}>Cambiar vehículo</Text></Pressable>
            <Text style={valetStyles.inputLabel}>Fecha</Text><Pressable accessibilityLabel={`Seleccionar fecha del servicio: ${formatServiceDateLabel(serviceDate)}`} accessibilityRole="button" onPress={onOpenDatePicker} style={valetStyles.dateTimeButton} testID="valet-request-date-selector"><Text style={valetStyles.bodyText}>{formatServiceDateLabel(serviceDate)}</Text></Pressable>
            <Text style={valetStyles.inputLabel}>Hora</Text><Pressable accessibilityRole="button" onPress={onOpenTimePicker} style={valetStyles.dateTimeButton} testID="valet-request-time-picker"><Text style={valetStyles.bodyText}>{requestedTime ?? 'Seleccionar hora'}</Text></Pressable>
            {noAvailability ? <StateCard body="No hay horarios disponibles durante tu estadía." testID="valet-request-no-availability" title="Sin disponibilidad" /> : scheduleError || (requestedTime !== null && !requestedTimeAllowed) ? <StateCard body="Selecciona una hora con al menos 30 minutos de anticipación." testID="valet-request-schedule-error" title="Hora no disponible" /> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !requestedTime || !requestedTimeAllowed || submitting || active.status !== 'PARKED' }} disabled={!requestedTime || !requestedTimeAllowed || submitting || active.status !== 'PARKED'} onPress={onSubmit} style={[valetStyles.button, (!requestedTime || !requestedTimeAllowed || submitting || active.status !== 'PARKED') && valetStyles.buttonDisabled]} testID="valet-request-button"><Text style={valetStyles.buttonLabel}>{submitting ? 'Solicitando...' : 'Solicitar vehículo'}</Text></Pressable>
          </View> : null}
          {!active ? <><Text style={valetStyles.actionHeading}>Selecciona un vehículo</Text>{vehicles.map((vehicle) => <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: vehicle.status !== 'PARKED', selected: vehicle.sessionVehicleId === activeKey }} disabled={vehicle.status !== 'PARKED'}
            key={vehicle.sessionVehicleId}
            onPress={() => onSelect(vehicle.sessionVehicleId)}
            style={[valetStyles.vehicleOption, vehicle.sessionVehicleId === activeKey && valetStyles.vehicleOptionSelected]}
            testID={`valet-session-vehicle-option-${vehicle.sessionVehicleId}`}
          ><Text style={valetStyles.bodyText}>{vehicleDisplay(vehicle)} · {formatVehiclePlate(vehicle.platePrefix, vehicle.plateBody)}</Text><Text style={valetStyles.mutedText}>{vehicleStatusText(vehicle.status)}</Text></Pressable>)}</> : null}
          <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cerrar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

type VehicleFormField = 'make' | 'model' | 'licensePlate';
type VehicleFormErrors = Partial<Record<VehicleFormField, string>>;

interface RegisterVehicleModalHandle { loadDraft: (vehicle: SessionVehicle) => void; resetDraft: () => void; }

const RegisterVehicleModal = forwardRef<RegisterVehicleModalHandle, { editing: boolean; onClose: () => void; onRegister: (input: { make: string; model: string; platePrefix: SessionVehicle['platePrefix']; plateBody: string; color: string; status: SessionVehicle['status'] }) => boolean; vehicles: readonly SessionVehicle[]; visible: boolean }>(function RegisterVehicleModal({ editing, onClose, onRegister, vehicles, visible }, ref) {
  const [make, setMake] = useState(''); const [model, setModel] = useState(''); const [platePrefix, setPlatePrefix] = useState<SessionVehicle['platePrefix']>('P'); const [plateBody, setPlateBody] = useState(''); const [prefixPickerVisible, setPrefixPickerVisible] = useState(false); const [color, setColor] = useState(''); const [status, setStatus] = useState<SessionVehicle['status']>('PARKED'); const [errors, setErrors] = useState<VehicleFormErrors>({});
  const setFieldError = (field: VehicleFormField, error?: string) => setErrors((current) => ({ ...current, [field]: error }));
  const resetFieldError = (field: VehicleFormField) => { if (errors[field]) setFieldError(field); };
  function resetDraft() {
    setMake(''); setModel(''); setPlatePrefix('P'); setPlateBody(''); setPrefixPickerVisible(false); setColor(''); setStatus('PARKED'); setErrors({});
  }
  function loadDraft(vehicle: SessionVehicle) {
    setMake(vehicle.make); setModel(vehicle.model); setPlatePrefix(vehicle.platePrefix); setPlateBody(vehicle.plateBody); setPrefixPickerVisible(false); setColor(vehicle.color ?? ''); setStatus(vehicle.status); setErrors({});
  }
  useImperativeHandle(ref, () => ({ loadDraft, resetDraft }), []);
  function registerVehicle() {
    const normalizedBody = plateBody.trim().toLocaleUpperCase();
    const nextErrors: VehicleFormErrors = {
      make: validateRequiredVehicleText(make, 'Marca') ?? undefined,
      model: validateRequiredVehicleText(model, 'Modelo') ?? undefined,
      licensePlate: validateVehiclePlateBody(normalizedBody) ?? undefined,
    };
    if (!nextErrors.licensePlate && hasDuplicateVehiclePlate(vehicles, platePrefix, normalizedBody)) nextErrors.licensePlate = 'Este vehículo ya está registrado.';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (onRegister({ make: make.trim(), model: model.trim(), platePrefix, plateBody: normalizedBody, color: color.trim(), status })) { resetDraft(); onClose(); }
    else setFieldError('licensePlate', 'Este vehículo ya está registrado.');
  }
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={valetStyles.modalBackdrop}><ScrollView contentContainerStyle={valetStyles.modalScroll}><View accessibilityViewIsModal style={valetStyles.modalSheet} testID="register-vehicle-modal">
    <Text accessibilityRole="header" style={valetStyles.cardHeading}>{editing ? 'Editar vehículo' : 'Registrar vehículo'}</Text>
    <Text style={valetStyles.inputLabel}>Marca</Text><TextInput accessibilityHint={errors.make} accessibilityLabel="Marca" maxLength={vehicleInputLimits.make} onChangeText={(value) => { setMake(value); resetFieldError('make'); }} style={[valetStyles.locationInput, errors.make && valetStyles.inputInvalid]} testID="register-vehicle-make" value={make} />
    {errors.make ? <Text accessibilityLiveRegion="polite" style={valetStyles.fieldError}>{errors.make}</Text> : null}
    <Text style={valetStyles.inputLabel}>Modelo</Text><TextInput accessibilityHint={errors.model} accessibilityLabel="Modelo" maxLength={vehicleInputLimits.model} onChangeText={(value) => { setModel(value); resetFieldError('model'); }} style={[valetStyles.locationInput, errors.model && valetStyles.inputInvalid]} testID="register-vehicle-model" value={model} />
    {errors.model ? <Text accessibilityLiveRegion="polite" style={valetStyles.fieldError}>{errors.model}</Text> : null}
    <Text style={valetStyles.inputLabel}>Placa</Text><View style={valetStyles.plateRow}><Pressable accessibilityLabel="Seleccionar tipo de placa" accessibilityRole="button" onPress={() => setPrefixPickerVisible(true)} style={valetStyles.platePrefix} testID="register-vehicle-plate-prefix"><Text style={valetStyles.bodyText}>{platePrefix} ▼</Text></Pressable><TextInput accessibilityHint={errors.licensePlate ?? 'Ingresa 2 o 3 números seguidos de 3 letras.'} accessibilityLabel="Número y serie de placa" autoCapitalize="characters" maxLength={vehicleInputLimits.plateBody} onBlur={() => { const error = validateVehiclePlateBody(plateBody); if (plateBody.trim()) setFieldError('licensePlate', error ?? undefined); }} onChangeText={(value) => { setPlateBody(sanitizeVehiclePlateBodyInput(value)); resetFieldError('licensePlate'); }} style={[valetStyles.locationInput, errors.licensePlate && valetStyles.inputInvalid]} testID="register-vehicle-license-plate" value={plateBody} /></View>
    {errors.licensePlate ? <Text accessibilityLiveRegion="polite" style={valetStyles.fieldError} testID="register-vehicle-license-plate-error">{errors.licensePlate}</Text> : null}
    <Text style={valetStyles.inputLabel}>Color (opcional)</Text><TextInput accessibilityLabel="Color (opcional)" maxLength={vehicleInputLimits.color} onChangeText={setColor} style={valetStyles.locationInput} testID="register-vehicle-color" value={color} />
    <Text style={valetStyles.inputLabel}>Ubicación actual</Text><View style={valetStyles.stepper}>
      {(['PARKED', 'WITH_GUEST'] as const).map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: status === option }} key={option} onPress={() => setStatus(option)} style={[valetStyles.vehicleOption, status === option && valetStyles.vehicleOptionSelected]} testID={`register-vehicle-status-${option}`}><Text style={valetStyles.secondaryButtonLabel}>{vehicleStatusText(option)}</Text></Pressable>)}
    </View>
    <Pressable accessibilityRole="button" onPress={registerVehicle} style={valetStyles.button} testID="register-vehicle-submit"><Text style={valetStyles.buttonLabel}>{editing ? 'Guardar vehículo' : 'Registrar vehículo'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cancelar</Text></Pressable>
  <Modal animationType="fade" onRequestClose={() => setPrefixPickerVisible(false)} transparent visible={prefixPickerVisible}><View style={valetStyles.prefixPickerBackdrop}><View accessibilityViewIsModal style={valetStyles.prefixPickerSheet} testID="register-vehicle-prefix-picker"><Text style={valetStyles.cardHeading}>Tipo de placa</Text><ScrollView contentContainerStyle={valetStyles.prefixPickerOptions} showsVerticalScrollIndicator><>{vehiclePlatePrefixes.map((prefix) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: prefix === platePrefix }} key={prefix} onPress={() => { setPlatePrefix(prefix); setPrefixPickerVisible(false); }} style={[valetStyles.vehicleOption, prefix === platePrefix && valetStyles.vehicleOptionSelected]} testID={`register-vehicle-prefix-${prefix}`}><Text style={valetStyles.bodyText}>{prefix}</Text></Pressable>)}</></ScrollView></View></View></Modal></View></ScrollView></View></Modal>;
});

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
      <TextInput accessibilityLabel={label} editable={false} maxLength={100} placeholder={label === 'Punto de recogida' ? 'Selecciona dónde deseas que te recojan' : 'Selecciona destino'} style={valetStyles.locationInput} value={place?.displayText ?? ''} />
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
  noAvailability,
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
  noAvailability: boolean;
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
              {noAvailability ? <StateCard body="No hay horarios disponibles durante tu estadía." testID="transfer-no-availability" title="Sin disponibilidad" /> : scheduleInvalid ? <Text accessibilityLiveRegion="polite" style={valetStyles.validationText} testID="transfer-schedule-error">Selecciona una hora con al menos 30 min de anticipación.</Text> : null}
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

export function ValetScreen({ clock = deviceClock, mapService = defaultMapService, routeService, service, stayService }: ValetScreenProps) {
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
  const { editRequestId, returnTo } = useLocalSearchParams<{ editRequestId?: string; returnTo?: string }>();
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
  const departure = stay.kind === 'success' ? stay.data.departure : null;
  const transferWithinStay = departure !== null && isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: formatServiceDate(scheduledAt), startTime: format24Hour(scheduledAt) });
  const transferNoAvailability = departure !== null && getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, departure) === null;
  const scheduleIsValid = transferWithinStay && isTransferScheduleValid({ now: clock.getNow(), scheduledAt });
  const scheduleInvalid = showScheduleFeedback && !scheduleIsValid;
  const dateText = scheduledAt.toLocaleDateString();
  const timeText = format24Hour(scheduledAt);
  const editedRequest = typeof editRequestId === 'string' && editRequestId !== ignoredTransferEditRequestId ? requests.find((request) => request.sessionRequestId === editRequestId) : undefined;
  const returnFromEdit = () => router.dismissTo(returnTo === 'account' ? '/account' : returnTo === 'requests' ? '/services/requests' : '/valet');
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
    if (!departure) return;
    const firstAvailable = getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, departure);
    const nearest = isServiceDateWithinStay(vehicleServiceDate, clock.getNow().getTime(), departure)
      ? getNearestServiceTime(vehicleServiceDate, allDayTimes, clock.getNow().getTime(), requestedTime, departure)
      : null;
    if (nearest) return;
    const timer = setTimeout(() => {
      if (firstAvailable) {
        setVehicleServiceDate(firstAvailable);
        setRequestedTime(getNearestServiceTime(firstAvailable, allDayTimes, clock.getNow().getTime(), undefined, departure));
      } else if (!isServiceDateWithinStay(vehicleServiceDate, clock.getNow().getTime(), departure)) setVehicleServiceDate(departure);
    }, 0);
    return () => clearTimeout(timer);
  }, [clock, departure, requestedTime, vehicleServiceDate]);

  useEffect(() => {
    const interval = setInterval(() => setTimeCheckVersion((current) => current + 1), 30_000);
    return () => clearInterval(interval);
  }, []);


  function submitVehicle() {
    if (!screen || vehicleRequest.isPending || vehicleInFlight.current) return;
    const selectedVehicle = vehicles.find((item) => item.sessionVehicleId === activeVehicleKey);
    if (!selectedVehicle || selectedVehicle.status !== 'PARKED' || !requestedTime) return;
    if (!departure || !isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: requestedTime })) {
      setVehicleScheduleError(true);
      return;
    }
    setVehicleScheduleError(false);
    vehicleInFlight.current = true;
    vehicleRequest.mutate(screen.activeVehicleKey, {
      onSuccess: () => {
        const input = { kind: 'VEHICLE_REQUEST' as const, origin: 'VALET' as const, status: 'REQUESTED' as const, summary: `${formatServiceDateLabel(vehicleServiceDate)} · ${requestedTime} · ${vehicleDisplay(selectedVehicle)}`, title: 'Solicitar mi vehículo', details: { type: 'VEHICLE_REQUEST' as const, serviceDate: vehicleServiceDate, sessionVehicleId: selectedVehicle.sessionVehicleId, requestedTime } };
        if (editedRequest?.kind === 'VEHICLE_REQUEST') updateRequest(editedRequest.sessionRequestId, input); else addRequest(input);
      },
      onSettled: () => { vehicleInFlight.current = false; },
    });
  }

  function submitTransfer() {
    if (!transferWithinStay || !isTransferScheduleValid({ now: clock.getNow(), scheduledAt })) {
      setShowScheduleFeedback(true);
      return;
    }
    if (!destination || !route.data || !fare || (destination.type === 'HOTEL' && !pickup) || transferReservation.isPending || transferInFlight.current) return;
    transferInFlight.current = true;
    transferReservation.mutate({ destinationType: destination.type, destinationPlace: destination, pickupPlace: destination.type === 'HOTEL' ? pickup : null, dateText, timeText, passengers, routeEstimate: route.data, fareEstimate: fare }, {
      onSuccess: () => {
        const input = { kind: 'TRANSFER' as const, origin: 'VALET' as const, status: 'REQUESTED' as const, summary: `${destination.displayText} · ${dateText} · ${timeText}`, title: 'Traslado', details: { type: 'TRANSFER' as const, destinationKey: destination.key, ...(pickup ? { pickupKey: pickup.key } : {}), scheduledAtMs: scheduledAt.getTime(), passengers } };
        if (editedRequest?.kind === 'TRANSFER') updateRequest(editedRequest.sessionRequestId, input); else addRequest(input);
      },
      onSettled: () => { transferInFlight.current = false; },
    });
  }

  function openCreateVehicle() {
    setEditingVehicleId(null);
    registerVehicleForm.current?.resetDraft();
    setRegisterVehicleVisible(true);
  }

  function openEditVehicle(sessionVehicleId: string) {
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
    setIgnoredTransferEditRequestId(typeof editRequestId === 'string' ? editRequestId : null);
    resetTransferDraft();
    setTransferModalVisible(true);
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
  const vehicle = vehicles.find((item) => item.sessionVehicleId === activeVehicleKey) ?? null;
  const vehicleOffline = vehicleRequest.isError && vehicleRequest.error instanceof NetworkError;
  const vehicleError = vehicleRequest.isError && !vehicleOffline;

  if (vehicleRequest.isSuccess && vehicle) return <View style={valetStyles.screen} testID="valet-request-success-screen"><ScrollView contentContainerStyle={[valetStyles.content, valetStyles.successContent]} style={valetStyles.scroll}><StateCard body="Tu solicitud fue enviada. Podrás confirmar la recepción cuando llegue el horario solicitado." success testID="valet-request-success" title="✓ Solicitud enviada" /><Text style={valetStyles.bodyText}>{vehicleDisplay(vehicle)} · {formatVehiclePlate(vehicle.platePrefix, vehicle.plateBody)}</Text>{editedRequest ? <Pressable accessibilityRole="button" onPress={returnFromEdit} style={valetStyles.secondaryButton} testID="valet-edit-return"><Text style={valetStyles.secondaryButtonLabel}>Volver</Text></Pressable> : null}</ScrollView><GuestNavigationShell /></View>;

  return <View style={valetStyles.screen} testID="valet-screen">
    <ScrollView contentContainerStyle={valetStyles.content} style={valetStyles.scroll}>
      <Text style={valetStyles.title}>Valet</Text>
      <Text style={valetStyles.subtitle}>Mis vehículos y transporte durante tu estadía</Text>
      <View style={valetStyles.card} testID="valet-vehicles-section"><Text style={valetStyles.cardHeading}>Mis vehículos</Text>{vehicles.length === 0 ? <Text style={valetStyles.mutedText}>Aún no tienes vehículos registrados.</Text> : vehicles.map((item) => <View key={item.sessionVehicleId} style={valetStyles.detailList}><Text style={valetStyles.bodyText}>{vehicleDisplay(item)}</Text><Text style={valetStyles.mutedText}>{formatVehiclePlate(item.platePrefix, item.plateBody)} · {vehicleStatusText(item.status)}</Text><Pressable accessibilityLabel={`Editar ${vehicleDisplay(item)}`} accessibilityRole="button" onPress={() => openEditVehicle(item.sessionVehicleId)} style={valetStyles.secondaryButton} testID={`valet-edit-${item.sessionVehicleId}`}><Text style={valetStyles.secondaryButtonLabel}>Editar vehículo</Text></Pressable>{item.status === 'WITH_GUEST' ? <Pressable accessibilityRole="button" onPress={() => setVehicleStatus(item.sessionVehicleId, 'PARKED')} style={valetStyles.secondaryButton} testID={`valet-return-${item.sessionVehicleId}`}><Text style={valetStyles.secondaryButtonLabel}>Entregar al valet</Text></Pressable> : null}</View>)}<Pressable accessibilityRole="button" onPress={openCreateVehicle} style={valetStyles.secondaryButton} testID="valet-register-vehicle"><Text style={valetStyles.secondaryButtonLabel}>Registrar vehículo</Text></Pressable></View>
      <Text style={valetStyles.cardHeading}>Servicios</Text>
      <Pressable accessibilityRole="button" onPress={() => vehicles.length ? setVehicleModalVisible(true) : openCreateVehicle()} style={valetStyles.card} testID="valet-vehicle-card"><Text style={valetStyles.cardHeading}>Solicitar mi vehículo</Text><Text style={valetStyles.mutedText}>{vehicles.length ? 'Selecciona un vehículo en parqueo.' : 'Registra un vehículo antes de solicitarlo.'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={openCreateTransfer} style={valetStyles.card} testID="valet-transfer-card"><Text style={valetStyles.cardHeading}>Solicitar traslado</Text><Text style={valetStyles.bodyText}>{destination.displayText}</Text><Text style={valetStyles.bodyText}>{dateText} · {timeText}</Text></Pressable>
      <Text style={valetStyles.mutedText}>{screen.folioNoticeText}</Text>
      {vehicleOffline ? <StateCard body="Conéctate a internet para solicitar tu vehículo." offline onRetry={submitVehicle} testID="valet-request-offline" title="Sin conexión" /> : null}
      {vehicleError ? <StateCard body="Intenta nuevamente." onRetry={submitVehicle} testID="valet-request-error" title="No pudimos solicitar tu vehículo" /> : null}
    </ScrollView>
    <GuestNavigationShell />
    <VehicleModal activeKey={vehicle?.sessionVehicleId ?? ''} noAvailability={departure !== null && getFirstAvailableServiceDate(clock.getNow().getTime(), allDayTimes, departure) === null} onClose={() => setVehicleModalVisible(false)} onOpenDatePicker={() => setVehicleDatePickerVisible(true)} onOpenTimePicker={() => { setVehicleScheduleError(false); setVehicleTimePickerVisible(true); }} onSelect={setActiveVehicleKey} onSubmit={submitVehicle} requestedTime={requestedTime} requestedTimeAllowed={departure !== null && requestedTime !== null && isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: requestedTime })} scheduleError={vehicleScheduleError} serviceDate={vehicleServiceDate} submitting={vehicleRequest.isPending} vehicles={vehicles} visible={vehicleModalVisible} />
    <RegisterVehicleModal editing={editingVehicleId !== null} ref={registerVehicleForm} onClose={() => { setEditingVehicleId(null); setRegisterVehicleVisible(false); }} onRegister={(input) => editingVehicleId ? updateVehicle(editingVehicleId, input) : addVehicle(input)} vehicles={editingVehicleId ? vehicles.filter((vehicle) => vehicle.sessionVehicleId !== editingVehicleId) : vehicles} visible={registerVehicleVisible} />
    <TransferModal dateText={dateText} destination={destination} fare={fare} mapError={mapError} noAvailability={transferNoAvailability} onClose={() => setTransferModalVisible(false)} onOpenDatePicker={() => setDatePickerVisible(true)} onOpenMap={() => { void openExternalMap(); }} onOpenSelector={setSelectorTarget} onOpenTimePicker={() => setTimePickerVisible(true)} onPassengers={(value) => setPassengers(Math.max(1, Math.min(3, value)))} onReserve={submitTransfer} onRetryRoute={() => void route.refetch()} onReset={() => { setIgnoredTransferEditRequestId(typeof editRequestId === 'string' ? editRequestId : null); resetTransferDraft(); }} origin={origin} passengers={passengers} pickup={pickup} reservation={transferReservation} route={route} scheduleInvalid={scheduleInvalid} scheduleIsValid={scheduleIsValid} timeText={timeText} visible={transferModalVisible} />
    <PlaceSelector onClose={() => setSelectorTarget(null)} onSelect={(place) => { setMapError(false); if (selectorTarget === 'destination') { setDestinationKey(place.key); setPickupKey(null); } else { setPickupKey(place.key); } setSelectorTarget(null); }} places={screen.places} selectedKey={selectorTarget === 'pickup' ? pickup?.key ?? null : destination.key} target={selectorTarget} visible={selectorTarget !== null} />
    {datePickerVisible ? <DateTimePicker display="default" maximumDate={departure ? parseServiceDate(departure) ?? undefined : undefined} minimumDate={startOfTransferDay(clock.getNow())} mode="date" onChange={onDatePickerChange} testID="transfer-date-picker" value={scheduledAt} /> : null}
    <TimeWheelPicker isValueDisabled={(value) => departure === null || !isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: formatServiceDate(scheduledAt), startTime: value })} mode="time" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { if (departure !== null && isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: formatServiceDate(scheduledAt), startTime: value })) onTimeWheelConfirm(value); }} testID="transfer-time-picker" title="Elegir hora" value={timeText} visible={timePickerVisible} />
    <ServiceDatePicker maximumDate={departure ? parseServiceDate(departure) ?? undefined : undefined} minimumDate={startOfTransferDay(clock.getNow())} onCancel={() => setVehicleDatePickerVisible(false)} onConfirm={(nextDate) => { setVehicleDatePickerVisible(false); setVehicleServiceDate(nextDate); setRequestedTime(departure ? getNearestServiceTime(nextDate, allDayTimes, clock.getNow().getTime(), requestedTime, departure) : null); }} testID="valet-request-date-picker" value={vehicleServiceDate} visible={vehicleDatePickerVisible} />
    <TimeWheelPicker isValueDisabled={(value) => departure === null || !isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: value })} mode="time" onCancel={() => setVehicleTimePickerVisible(false)} onConfirm={(value) => { if (departure !== null && isServiceWithinStayWindow({ departure, nowMs: clock.getNow().getTime(), serviceDate: vehicleServiceDate, startTime: value })) { setVehicleScheduleError(false); setRequestedTime(value); } setVehicleTimePickerVisible(false); }} testID="valet-request-time-picker-wheel" title="Elegir hora de solicitud" value={requestedTime ?? '00:00'} visible={vehicleTimePickerVisible} />
  </View>;
}

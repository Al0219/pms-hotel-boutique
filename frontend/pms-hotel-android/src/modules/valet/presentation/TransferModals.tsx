import {Modal,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {NetworkError} from '@/data/remote/http/HttpError';
import type {TransferPlace} from '../domain/models/ValetScreen';
import {calculateTransferFare} from '../domain/services/TransferFareCalculator';
import {useTransferRouteEstimate} from './hooks/useTransferRouteEstimate';
import {StateCard} from './ValetVehicleModals';
import {valetStyles} from './valetStyles';
type SelectorTarget='destination'|'pickup'|null;
export function PlaceSelector({
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

export function TransferModal({
  demonstration=false,
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
  demonstration?:boolean;
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
  reservation: {isSuccess:boolean;isPending:boolean;isError:boolean;error:unknown;data?:{confirmationText:string}};
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
              <Text style={valetStyles.stateTitle}>✓ {reservation.data?.confirmationText}</Text>
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
                <Text style={valetStyles.mutedText}>{demonstration?'Ruta estimada · tarifa Demo':'Precio estimado'}</Text><Text style={valetStyles.actionHeading}>{fare.estimatedPriceText}</Text>
                {canViewMap ? <Pressable accessibilityLabel="Ver ruta en Maps" accessibilityRole="button" onPress={onOpenMap} style={valetStyles.mapButton} testID="transfer-view-route-maps"><Text style={valetStyles.mapButtonLabel}>Ver ruta en Maps</Text></Pressable> : null}
                {mapError ? <Text accessibilityLiveRegion="polite" style={valetStyles.validationText} testID="transfer-maps-error">No pudimos abrir Maps. Puedes intentar nuevamente.</Text> : null}
              </View> : null}
              {!route.isPending && !route.data && !routeError && !routeOffline ? <Text style={valetStyles.mutedText}>Selecciona una ubicación para calcular la tarifa.</Text> : null}
              {routeOffline ? <StateCard body="Conéctate a internet para calcular la tarifa." offline onRetry={onRetryRoute} testID="transfer-route-offline" title="Sin conexión" /> : null}
              {routeError ? <StateCard body="Intenta nuevamente." onRetry={onRetryRoute} testID="transfer-route-error" title="No pudimos calcular la ruta" /> : null}
              {reserveOffline ? <StateCard body="Conéctate a internet para reservar el traslado." offline onRetry={onReserve} testID="valet-transfer-offline" title="Sin conexión" /> : null}
              {reserveError ? <StateCard body="Intenta nuevamente." onRetry={onReserve} testID="valet-transfer-error" title="No pudimos reservar el traslado" /> : null}
              {!reserveError && !reserveOffline ? <Pressable accessibilityLabel={reservation.isPending ? 'Enviando…' : demonstration?'Enviar solicitud':'Reservar traslado'} accessibilityRole="button" accessibilityState={{ busy: reservation.isPending, disabled: !canReserve }} disabled={!canReserve} onPress={onReserve} style={[valetStyles.button, !canReserve && valetStyles.buttonDisabled]} testID="transfer-reserve-button"><Text style={valetStyles.buttonLabel}>{reservation.isPending ? 'Enviando…' : demonstration?'Enviar solicitud':'Reservar traslado'}</Text></Pressable> : null}
            </>}
            <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cerrar</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

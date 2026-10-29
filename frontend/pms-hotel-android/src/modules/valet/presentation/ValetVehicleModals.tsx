import {forwardRef,useImperativeHandle,useState} from 'react';
import {Modal,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {formatServiceDateLabel} from '@/modules/service-requests';
import type {SessionVehicle} from '../session/SessionVehicle';
import {formatVehiclePlate,hasDuplicateVehiclePlate,sanitizeVehiclePlateBodyInput,validateRequiredVehicleText,validateVehiclePlateBody,vehicleInputLimits,vehiclePlatePrefixes} from '../session/vehicleValidation';
import {valetStyles} from './valetStyles';

export function vehicleDisplay(vehicle: SessionVehicle): string {
  return `${vehicle.make} ${vehicle.model}${vehicle.color ? ` · ${vehicle.color}` : ''}`;
}

export function vehicleStatusText(status: SessionVehicle['status']): string { return status === 'PARKED' ? 'En parqueo' : 'Conmigo'; }

export function StateCard({
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

export function VehicleModal({
  error,lockVehicle=false,
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
  error?:string;lockVehicle?:boolean;
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
            <Pressable accessibilityRole="button" disabled={lockVehicle} onPress={() => onSelect('')} style={valetStyles.secondaryButton} testID="valet-change-vehicle"><Text style={valetStyles.secondaryButtonLabel}>Cambiar vehículo</Text></Pressable>
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
          {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
          <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cerrar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

type VehicleFormField = 'make' | 'model' | 'licensePlate';
type VehicleFormErrors = Partial<Record<VehicleFormField, string>>;

export interface RegisterVehicleModalHandle { loadDraft: (vehicle: SessionVehicle) => void; resetDraft: () => void; }

export const RegisterVehicleModal = forwardRef<RegisterVehicleModalHandle, { editing: boolean; onClose: () => void; onRegister: (input: { make: string; model: string; platePrefix: SessionVehicle['platePrefix']; plateBody: string; color: string; status: SessionVehicle['status'] }) => boolean | Promise<boolean>; submitting?: boolean; error?: string; lockLocation?: boolean; vehicles: readonly Pick<SessionVehicle,'platePrefix'|'plateBody'>[]; visible: boolean }>(function RegisterVehicleModal({ editing, onClose, onRegister, submitting=false, error, lockLocation=false, vehicles, visible }, ref) {
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
    const result = onRegister({ make: make.trim(), model: model.trim(), platePrefix, plateBody: normalizedBody, color: color.trim(), status });
    const finish=(ok:boolean)=>{if(ok){resetDraft();onClose();}};
    if(result instanceof Promise)void result.then(finish);else if(result)finish(true);else setFieldError('licensePlate', 'Este vehículo ya está registrado.');
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
      {(['PARKED', 'WITH_GUEST'] as const).map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: status === option, disabled:lockLocation }} disabled={lockLocation} key={option} onPress={() => setStatus(option)} style={[valetStyles.vehicleOption, status === option && valetStyles.vehicleOptionSelected]} testID={`register-vehicle-status-${option}`}><Text style={valetStyles.secondaryButtonLabel}>{vehicleStatusText(option)}</Text></Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite">{error}</Text><Pressable accessibilityRole="button" disabled={submitting} onPress={registerVehicle} style={valetStyles.button} testID="register-vehicle-submit"><Text style={valetStyles.buttonLabel}>{submitting ? 'Guardando…' : editing ? 'Guardar vehículo' : 'Registrar vehículo'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onClose} style={valetStyles.secondaryButton}><Text style={valetStyles.secondaryButtonLabel}>Cancelar</Text></Pressable>
  <Modal animationType="fade" onRequestClose={() => setPrefixPickerVisible(false)} transparent visible={prefixPickerVisible}><View style={valetStyles.prefixPickerBackdrop}><View accessibilityViewIsModal style={valetStyles.prefixPickerSheet} testID="register-vehicle-prefix-picker"><Text style={valetStyles.cardHeading}>Tipo de placa</Text><ScrollView contentContainerStyle={valetStyles.prefixPickerOptions} showsVerticalScrollIndicator><>{vehiclePlatePrefixes.map((prefix) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: prefix === platePrefix }} key={prefix} onPress={() => { setPlatePrefix(prefix); setPrefixPickerVisible(false); }} style={[valetStyles.vehicleOption, prefix === platePrefix && valetStyles.vehicleOptionSelected]} testID={`register-vehicle-prefix-${prefix}`}><Text style={valetStyles.bodyText}>{prefix}</Text></Pressable>)}</></ScrollView></View></View></Modal></View></ScrollView></View></Modal>;
});

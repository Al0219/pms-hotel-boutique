/** Frontend format checks for session-only vehicle registration; this is not SAT validation. */
import { type VehiclePlatePrefix } from '@/modules/valet/session/SessionVehicle';

export const vehicleInputLimits = {
  color: 30,
  plateBody: 6,
  make: 40,
  model: 40,
} as const;

export const vehiclePlatePrefixes: readonly VehiclePlatePrefix[] = ['P', 'A', 'C', 'TE', 'U', 'TRC', 'M', 'MT', 'TC', 'O', 'CD', 'CC', 'MI', 'DIS'];

export function normalizePlateForComparison(prefix: VehiclePlatePrefix, body: string): string {
  return `${prefix}${body.trim().toLocaleUpperCase()}`;
}

export function formatVehiclePlate(prefix: VehiclePlatePrefix, body: string): string {
  return `${prefix} ${body.trim().toLocaleUpperCase()}`;
}

export function validateRequiredVehicleText(value: string, label: 'Marca' | 'Modelo'): string | null {
  return value.trim() ? null : label === 'Marca' ? 'Marca requerida.' : 'Modelo requerido.';
}

export function validateVehiclePlateBody(value: string): string | null {
  const body = value.trim().toLocaleUpperCase();
  if (!body) return 'Placa requerida.';
  if (!/^\d{2,3}[A-Z]{3}$/.test(body)) return 'La placa debe tener 2 o 3 números seguidos de 3 letras.';
  return null;
}

/** Keeps only incremental plate states: up to three digits followed by up to three letters. */
export function sanitizeVehiclePlateBodyInput(next: string): string {
  const value = next.toLocaleUpperCase().replace(/[^0-9A-Z]/g, '');
  const match = /^(\d{0,3})([A-Z]{0,3})/.exec(value);
  return match ? `${match[1]}${match[2]}` : '';
}

export function hasDuplicateVehiclePlate(vehicles: readonly { platePrefix: VehiclePlatePrefix; plateBody: string }[], prefix: VehiclePlatePrefix, body: string): boolean {
  const comparisonValue = normalizePlateForComparison(prefix, body);
  return vehicles.some((vehicle) => normalizePlateForComparison(vehicle.platePrefix, vehicle.plateBody) === comparisonValue);
}

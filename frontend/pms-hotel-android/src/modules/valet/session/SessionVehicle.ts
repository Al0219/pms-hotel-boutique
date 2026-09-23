/** Guest-owned vehicle data kept only for the active frontend session. */
export type SessionVehicleStatus = 'PARKED' | 'WITH_GUEST';
export type VehiclePlatePrefix = 'P' | 'A' | 'C' | 'TE' | 'U' | 'TRC' | 'M' | 'MT' | 'TC' | 'O' | 'CD' | 'CC' | 'MI' | 'DIS';

export interface SessionVehicle {
  sessionVehicleId: string;
  make: string;
  model: string;
  platePrefix: VehiclePlatePrefix;
  plateBody: string;
  color?: string;
  status: SessionVehicleStatus;
}

export interface AddSessionVehicleInput {
  make: string;
  model: string;
  platePrefix: VehiclePlatePrefix;
  plateBody: string;
  color?: string;
  status: SessionVehicleStatus;
}

import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useReducer, useRef } from 'react';

import { type AddSessionVehicleInput, type SessionVehicle, type SessionVehicleStatus } from '@/modules/valet/session/SessionVehicle';
import { hasDuplicateVehiclePlate, validateRequiredVehicleText, validateVehiclePlateBody } from '@/modules/valet/session/vehicleValidation';

interface SessionVehiclesState { vehicles: readonly SessionVehicle[]; }
type SessionVehiclesAction =
  | { type: 'ADD'; vehicle: SessionVehicle }
  | { type: 'UPDATE'; sessionVehicleId: string; vehicle: AddSessionVehicleInput }
  | { type: 'SET_STATUS'; sessionVehicleId: string; status: SessionVehicleStatus };

export const initialSessionVehiclesState: SessionVehiclesState = { vehicles: [] };

export function sessionVehiclesReducer(state: SessionVehiclesState, action: SessionVehiclesAction): SessionVehiclesState {
  if (action.type === 'ADD') return { vehicles: [...state.vehicles, action.vehicle] };
  if (action.type === 'UPDATE') return { vehicles: state.vehicles.map((vehicle) => vehicle.sessionVehicleId === action.sessionVehicleId ? { ...vehicle, ...action.vehicle } : vehicle) };
  return { vehicles: state.vehicles.map((vehicle) => vehicle.sessionVehicleId === action.sessionVehicleId ? { ...vehicle, status: action.status } : vehicle) };
}

interface SessionVehiclesContextValue {
  vehicles: readonly SessionVehicle[];
  addVehicle: (input: AddSessionVehicleInput) => boolean;
  updateVehicle: (sessionVehicleId: string, input: AddSessionVehicleInput) => boolean;
  setVehicleStatus: (sessionVehicleId: string, status: SessionVehicleStatus) => void;
}

const SessionVehiclesContext = createContext<SessionVehiclesContextValue | null>(null);

/** In-memory registry; it intentionally resets when the Guest tree/process ends. */
export function SessionVehiclesProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(sessionVehiclesReducer, initialSessionVehiclesState);
  const sequence = useRef(0);
  const addVehicle = useCallback((input: AddSessionVehicleInput) => {
    const make = input.make.trim(); const model = input.model.trim(); const plateBody = input.plateBody.trim().toLocaleUpperCase(); const color = input.color?.trim();
    if (validateRequiredVehicleText(make, 'Marca') || validateRequiredVehicleText(model, 'Modelo') || validateVehiclePlateBody(plateBody) || hasDuplicateVehiclePlate(state.vehicles, input.platePrefix, plateBody)) return false;
    sequence.current += 1;
    dispatch({ type: 'ADD', vehicle: { ...input, make, model, plateBody, ...(color ? { color } : {}), sessionVehicleId: `session-vehicle-${sequence.current}` } });
    return true;
  }, [state.vehicles]);
  const updateVehicle = useCallback((sessionVehicleId: string, input: AddSessionVehicleInput) => {
    const existing = state.vehicles.find((vehicle) => vehicle.sessionVehicleId === sessionVehicleId);
    const make = input.make.trim(); const model = input.model.trim(); const plateBody = input.plateBody.trim().toLocaleUpperCase(); const color = input.color?.trim();
    if (!existing || validateRequiredVehicleText(make, 'Marca') || validateRequiredVehicleText(model, 'Modelo') || validateVehiclePlateBody(plateBody) || hasDuplicateVehiclePlate(state.vehicles.filter((vehicle) => vehicle.sessionVehicleId !== sessionVehicleId), input.platePrefix, plateBody)) return false;
    dispatch({ type: 'UPDATE', sessionVehicleId, vehicle: { ...input, make, model, plateBody, ...(color ? { color } : {}) } });
    return true;
  }, [state.vehicles]);
  const setVehicleStatus = useCallback((sessionVehicleId: string, status: SessionVehicleStatus) => dispatch({ type: 'SET_STATUS', sessionVehicleId, status }), []);
  const value = useMemo(() => ({ addVehicle, setVehicleStatus, updateVehicle, vehicles: state.vehicles }), [addVehicle, setVehicleStatus, state.vehicles, updateVehicle]);
  return <SessionVehiclesContext.Provider value={value}>{children}</SessionVehiclesContext.Provider>;
}

export function useSessionVehicles(): SessionVehiclesContextValue {
  const context = useContext(SessionVehiclesContext);
  if (!context) throw new Error('useSessionVehicles must be used inside SessionVehiclesProvider');
  return context;
}

export function useOptionalSessionVehicles(): SessionVehiclesContextValue | null { return useContext(SessionVehiclesContext); }

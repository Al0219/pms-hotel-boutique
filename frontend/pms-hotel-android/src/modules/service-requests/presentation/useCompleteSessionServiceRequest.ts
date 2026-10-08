import { useCallback } from 'react';

import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';
import { canCompleteServiceRequest } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { useSessionServiceRequests } from '@/modules/service-requests/presentation/SessionServiceRequestsProvider';
import { useOptionalSessionVehicles } from '@/modules/valet/session/SessionVehiclesProvider';
import { useAppClock } from '@/shared/time';

/** Completes exactly one local request; vehicle receipt also updates its linked vehicle. */
export function useCompleteSessionServiceRequest(): (request: SessionServiceRequest) => void {
  const { completeRequest } = useSessionServiceRequests();
  const vehiclesContext = useOptionalSessionVehicles();
  const appClock = useAppClock();
  return useCallback((request) => {
    if (!canCompleteServiceRequest(request, appClock.nowMs())) return;
    const details = request.details;
    if (request.kind === 'VEHICLE_REQUEST' && details?.type === 'VEHICLE_REQUEST') {
      if (!vehiclesContext) return;
      const vehicle = vehiclesContext.vehicles.find((item) => item.sessionVehicleId === details.sessionVehicleId);
      if (!vehicle || vehicle.status !== 'PARKED') return;
      if (!completeRequest(request.sessionRequestId)) return;
      vehiclesContext.setVehicleStatus(vehicle.sessionVehicleId, 'WITH_GUEST');
      return;
    }
    completeRequest(request.sessionRequestId);
  }, [appClock, completeRequest, vehiclesContext]);
}

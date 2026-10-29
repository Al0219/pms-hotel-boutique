import { DomainMappingError } from '@/lib/errors';
import { isUtcInstant } from '@/lib/utc-instant';
import type { StayLifecycleResultDto } from '../dtos/stay-lifecycle.dto';
import type { StayLifecycleAction, StayLifecycleReceipt, StayLifecycleScope } from '../model/stay-lifecycle';

export function mapStayLifecycleReceipt(dto: StayLifecycleResultDto, scope: StayLifecycleScope, action: StayLifecycleAction): StayLifecycleReceipt {
  if (!dto || dto.propertyId !== scope.propertyId || dto.reservationId !== scope.reservationId || dto.stayId !== scope.stayId
    || typeof dto.operationId !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(dto.operationId)
    || !isUtcInstant(dto.completedAt) || dto.status !== (action === 'check-in' ? 'IN_HOUSE' : 'CHECKED_OUT'))
    throw new DomainMappingError('INVALID_STAY_LIFECYCLE_RECEIPT');
  return { ...scope, operationId: dto.operationId, status: dto.status, completedAt: dto.completedAt };
}

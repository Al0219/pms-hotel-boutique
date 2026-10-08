import { type HousekeepingRequest } from '@/modules/services/housekeeping/domain/HousekeepingRequest';

export interface HousekeepingService {
  submitRequest(input: HousekeepingRequest): Promise<void>;
}

import { environment } from '@/config/environment';
import { HttpHousekeepingService } from '../http/HttpHousekeepingService';
import { MockHousekeepingService } from '../mocks/MockHousekeepingService';
import { type HousekeepingService } from './HousekeepingService';
export const housekeepingService: HousekeepingService = environment.useMockApi ? new MockHousekeepingService() : new HttpHousekeepingService();

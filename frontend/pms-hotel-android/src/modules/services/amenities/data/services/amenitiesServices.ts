import { environment } from '@/config/environment';
import { MockAmenitiesService } from '../mocks/MockAmenitiesService';
import { HttpAmenitiesService } from '../http/HttpAmenitiesService';
import type { AmenitiesService } from './AmenitiesService';
export const amenitiesService: AmenitiesService = environment.useMockApi ? new MockAmenitiesService() : new HttpAmenitiesService();

import { environment } from '@/config/environment';
import { MockRoomServiceService } from '../mocks/MockRoomServiceService';
import { HttpRoomServiceService } from '../http/HttpRoomServiceService';
import type { RoomServiceService } from './RoomServiceService';
export const roomServiceService: RoomServiceService = environment.useMockApi ? new MockRoomServiceService() : new HttpRoomServiceService();

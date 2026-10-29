import { type GuestAuthService } from './GuestAuthService';
import { type GuestAccountService } from './GuestAccountService';
import { type LinkedReservationsService } from './LinkedReservationsService';
import { environment } from '@/config/environment';
import { HttpGuestAuthService, HttpGuestAccountService, HttpLinkedReservationsService } from '@/modules/guest-auth/data/http/HttpGuestServices';
import { MockGuestAuthService } from '@/modules/guest-auth/data/mocks/MockGuestAuthService';
import { MockGuestAccountService } from '@/modules/guest-auth/data/mocks/MockGuestAccountService';
import { MockLinkedReservationsService } from '@/modules/guest-auth/data/mocks/MockLinkedReservationsService';

export const guestAuthService: GuestAuthService = environment.useMockApi ? new MockGuestAuthService() : new HttpGuestAuthService();
export const guestAccountService: GuestAccountService = environment.useMockApi ? new MockGuestAccountService() : new HttpGuestAccountService();
export const linkedReservationsService: LinkedReservationsService = environment.useMockApi ? new MockLinkedReservationsService() : new HttpLinkedReservationsService();

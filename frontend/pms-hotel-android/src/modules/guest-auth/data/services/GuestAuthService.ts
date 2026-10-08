import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { type GuestLoginRequest } from '@/modules/guest-auth/domain/models/GuestLoginRequest';

/** Auth boundary for the frontend-first mock; it does not imply backend authentication. */
export interface GuestAuthService {
  login(request: GuestLoginRequest): Promise<GuestAuthSession>;
}

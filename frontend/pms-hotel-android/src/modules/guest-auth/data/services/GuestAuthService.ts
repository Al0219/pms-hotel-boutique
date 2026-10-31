import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { type GuestLoginRequest } from '@/modules/guest-auth/domain/models/GuestLoginRequest';

/** Guest Auth boundary, implemented by explicit mock or native HTTP configuration. */
export interface GuestAuthService {
  restore?(): Promise<GuestAuthSession | null>;
  logout?(): Promise<void>;
  login(request: GuestLoginRequest): Promise<GuestAuthSession>;
  loginWithTokens?(tokens: { accessToken: string; refreshToken?: string; accessTokenExpiresInSeconds?: number }): Promise<GuestAuthSession>;
}

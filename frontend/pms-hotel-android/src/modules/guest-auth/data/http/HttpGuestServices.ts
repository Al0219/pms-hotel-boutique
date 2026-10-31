import { type GuestAccountSummaryDto, type GuestLinkedStayDto } from '@/modules/guest-auth/data/dto/GuestAccountSummaryDto';
import { mapGuestAccountSummaryDto } from '@/modules/guest-auth/data/mappers/mapGuestAccountSummaryDto';
import { mapLinkedReservationSummaryDto } from '@/modules/guest-auth/data/mappers/mapLinkedReservationSummaryDto';
import { NativeGuestClient, nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { type GuestAuthService } from '@/modules/guest-auth/data/services/GuestAuthService';
import { type GuestAccountService } from '@/modules/guest-auth/data/services/GuestAccountService';
import { type LinkedReservationsService } from '@/modules/guest-auth/data/services/LinkedReservationsService';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { type GuestLoginRequest } from '@/modules/guest-auth/domain/models/GuestLoginRequest';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';

export class HttpGuestAuthService implements GuestAuthService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  login(request: GuestLoginRequest) { return this.client.login(request); }
  loginWithTokens(tokens: { accessToken: string; refreshToken?: string; accessTokenExpiresInSeconds?: number }) {
    return this.client.loginWithTokens(tokens);
  }
  restore() { return this.client.restore(); }
  logout() { return this.client.logout(); }
}
export class HttpGuestAccountService implements GuestAccountService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  async getCurrent(session: GuestAuthSession) {
    const account = mapGuestAccountSummaryDto(await this.client.request<GuestAccountSummaryDto>('/api/v1/guest-auth/account/summary'));
    if (account.key !== session.accountId) throw new DomainMappingError('guestAccountSummary.guestAccountId');
    return account;
  }
}
export class HttpLinkedReservationsService implements LinkedReservationsService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  async listForAccount(_accountId: string) {
    // The accountId is a local cache identity, never an HTTP authority.
    await this.client.request<null>('/api/v1/guest-auth/account/reservations/reconcile', { method: 'POST' });
    const rows = await this.client.request<GuestLinkedStayDto[]>('/api/v1/guest-auth/account/reservations');
    if (!Array.isArray(rows)) throw new DomainMappingError('linkedReservations');
    return rows.map((row) => {
      if (!row || typeof row.propertyName !== 'string' || !row.propertyName.trim()
        || typeof row.status !== 'string' || !row.status.trim()
        || !(row.roomCode === null || typeof row.roomCode === 'string')) throw new DomainMappingError('linkedReservation');
      return mapLinkedReservationSummaryDto({
        reservationId: row.reservationId, reservationStayId: row.stayId,
        reference: row.confirmationCode, propertyLabel: row.propertyName,
        arrival: row.arrival, departure: row.departure, roomLabel: row.roomCode, statusLabel: row.status,
      });
    });
  }
}

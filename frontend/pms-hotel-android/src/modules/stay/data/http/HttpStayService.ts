import { type GuestStayDto } from '@/modules/stay/data/dtos/GuestStayDto';
import { NativeGuestClient, nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type StayService } from '@/modules/stay/data/services/StayService';
import { type ReservationStayDto } from '@/modules/stay/data/dtos/ReservationStayDto';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
export class HttpStayService implements StayService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  async getCurrentStay(context: ActiveReservationContext): Promise<ReservationStayDto> {
    const dto = await this.client.request<GuestStayDto>(`/api/v1/guest-auth/account/reservations/${encodeURIComponent(context.reservationId)}/stays/${encodeURIComponent(context.reservationStayId)}`);
    if (!dto || dto.id !== context.reservationStayId || dto.reservationId !== context.reservationId) throw new DomainMappingError('guestStay.identity');
    return { ...dto, room: dto.room === null ? null : { id: dto.room?.id, number: dto.room?.code } };
  }
}

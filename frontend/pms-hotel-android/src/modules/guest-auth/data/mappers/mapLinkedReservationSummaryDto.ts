import { requireDtoField } from '@/data/mapping/requireDtoField';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { type LinkedReservationSummaryDto } from '@/modules/guest-auth/data/dto/LinkedReservationSummaryDto';
import { type LinkedReservationSummary } from '@/modules/guest-auth/domain/models/LinkedReservationSummary';

function requiredText(value: string | null | undefined, field: string): string {
  const text = requireDtoField(value, field);
  if (text.trim().length === 0) throw new DomainMappingError(field);
  return text;
}

/** Maps the narrow reservation-selection projection without defaulting domain data. */
export function mapLinkedReservationSummaryDto(dto: LinkedReservationSummaryDto | null | undefined): LinkedReservationSummary {
  const value = requireDtoField(dto, 'linkedReservation');
  return {
    reservationId: requiredText(value.reservationId, 'linkedReservation.reservationId'),
    reservationStayId: requiredText(value.reservationStayId, 'linkedReservation.reservationStayId'),
    reference: requiredText(value.reference, 'linkedReservation.reference'),
    arrival: requiredText(value.arrival, 'linkedReservation.arrival'),
    departure: requiredText(value.departure, 'linkedReservation.departure'),
    ...(value.propertyLabel === undefined ? {} : { propertyLabel: requiredText(value.propertyLabel, 'linkedReservation.propertyLabel') }),
    ...(value.roomLabel === undefined ? {} : { roomLabel: value.roomLabel }),
    ...(value.statusLabel === undefined ? {} : { statusLabel: requiredText(value.statusLabel, 'linkedReservation.statusLabel') }),
  };
}

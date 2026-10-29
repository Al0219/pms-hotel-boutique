import { DomainMappingError } from '@/lib/errors';
import { isUtcInstant } from '@/lib/utc-instant';
import { object, text } from '@/lib/validation';
import type { StaffReservationDto } from '../dtos/staff-reservation.dto';

const fail = () => { throw new DomainMappingError('INVALID_STAFF_RESERVATION_DETAILS'); };
const uuid = (value: unknown) => { const id = text(value); return /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id) ? id : fail(); };
const optional = (value: unknown) => value === null ? null : text(value);

export function mapStaffReservationInformation(dto: StaffReservationDto) {
  if (dto.details === undefined) return undefined;
  const data = object(dto.details);
  if (!isUtcInstant(data.updatedAt) || !Array.isArray(data.stays)) fail();
  const contact = data.contact === null ? null : object(data.contact);
  if (contact?.country !== undefined && contact.country !== null && (typeof contact.country !== 'string' || !/^[A-Z]{2}$/.test(contact.country))) fail();
  if (contact && (uuid(contact.profileId) !== dto.responsibleGuest?.profileId || (contact.documentNumberMasked !== null
    && (typeof contact.documentNumberMasked !== 'string' || !/^••••(?: .{4})?$/u.test(contact.documentNumberMasked))))) fail();
  const ids = new Set<string>();
  const stays = (data.stays as unknown[]).map(value => {
    const s = object(value), id = uuid(s.stayId);
    if (!dto.stays.some(stay => stay.stayId === id) || ids.has(id) || !Array.isArray(s.occupants)) fail();
    ids.add(id);
    const profiles = new Set<string>();
    return { stayId: id, occupants: (s.occupants as unknown[]).map(value => {
      const guest = object(value), profileId = uuid(guest.profileId);
      if (profiles.has(profileId) || typeof guest.primary !== 'boolean') fail();
      profiles.add(profileId);
      return { profileId, fullName: text(guest.fullName), primary: guest.primary as boolean };
    }) };
  });
  if (ids.size !== dto.stays.length) fail();
  return { updatedAt: new Date(data.updatedAt as string), notes: optional(data.notes),
    contact: contact === null ? null : { profileId: uuid(contact.profileId), email: optional(contact.email), phone: optional(contact.phone),
      documentType: optional(contact.documentType), documentNumberMasked: optional(contact.documentNumberMasked), preferredLanguage: optional(contact.preferredLanguage),
      ...(contact.country !== undefined && { country: contact.country as string | null }) }, stays };
}

import { isUtcInstant } from '@/lib/utc-instant';

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_UPSTREAM');
  return value as Record<string, unknown>;
};
const text = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_UPSTREAM');
  return value;
};
const optional = (value: unknown) => value === null ? null : text(value);
const uuid = (value: unknown) => {
  const id = text(value);
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) throw new Error('INVALID_UPSTREAM');
  return id;
};

/** Detail-only allowlist. Never forward raw upstream profiles, accounts or documents. */
export function projectStaffReservationDetails(value: unknown, responsibleId: string | null, stayIds: string[]) {
  const data = object(value);
  if (!isUtcInstant(data.updatedAt) || !Array.isArray(data.stays)) throw new Error('INVALID_UPSTREAM');
  const contact = data.contact === null ? null : object(data.contact);
  if (contact?.country !== undefined && contact.country !== null && (typeof contact.country !== 'string' || !/^[A-Z]{2}$/.test(contact.country))) throw new Error('INVALID_UPSTREAM');
  if (contact && (uuid(contact.profileId) !== responsibleId || (contact.documentNumberMasked !== null
    && (typeof contact.documentNumberMasked !== 'string' || !/^••••(?: .{4})?$/u.test(contact.documentNumberMasked))))) throw new Error('INVALID_UPSTREAM');
  const ids = new Set<string>();
  const stays = data.stays.map(value => {
    const stay = object(value), id = uuid(stay.stayId);
    if (!stayIds.includes(id) || ids.has(id) || !Array.isArray(stay.occupants)) throw new Error('INVALID_UPSTREAM');
    ids.add(id);
    const profiles = new Set<string>();
    return { stayId: id, occupants: stay.occupants.map(value => {
      const guest = object(value), profileId = uuid(guest.profileId);
      if (profiles.has(profileId) || typeof guest.primary !== 'boolean') throw new Error('INVALID_UPSTREAM');
      profiles.add(profileId);
      return { profileId, fullName: text(guest.fullName), primary: guest.primary };
    }) };
  });
  if (ids.size !== stayIds.length) throw new Error('INVALID_UPSTREAM');
  return { updatedAt: data.updatedAt, notes: optional(data.notes),
    contact: contact === null ? null : { profileId: uuid(contact.profileId), email: optional(contact.email), phone: optional(contact.phone),
      documentType: optional(contact.documentType), documentNumberMasked: optional(contact.documentNumberMasked), preferredLanguage: optional(contact.preferredLanguage),
      ...(contact.country !== undefined && { country: contact.country as string | null }) }, stays };
}

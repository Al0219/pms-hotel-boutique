import { type AmenityCatalogItem } from '@/modules/services/amenities/domain/AmenitiesRequest';

/** Approved frontend/mock catalogue. It is not an availability, stock or price contract. */
export const amenitiesCatalogFixture: readonly AmenityCatalogItem[] = [
  { fixtureKey: 'extra-towels', name: 'Toallas adicionales' },
  { fixtureKey: 'extra-pillow', name: 'Almohada adicional' },
  { fixtureKey: 'dental-kit', name: 'Kit dental' },
  { fixtureKey: 'toiletry-kit', name: 'Kit de aseo' },
  { fixtureKey: 'slippers', name: 'Pantuflas' },
];

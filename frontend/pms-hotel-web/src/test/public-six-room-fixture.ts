import type { PublicAvailabilityResponseDTO } from '@/modules/availability';
import { publicPropertyId } from './public-availability-fixture';
/** Independent test fixture; never imports the Docker bootstrap or reads demo DB. */
export const sixRoomAvailability: PublicAvailabilityResponseDTO = {
  propertyId: publicPropertyId, arrival: '2026-11-01', departure: '2026-11-03', currency: 'GTQ',
  offers: [
    ['STD','Habitación Estándar',65000,'DEMO_STANDARD'], ['CLASSIC','Habitación Classic',65000,'DEMO_STANDARD'],
    ['TWIN','Habitación Twin',65000,'DEMO_STANDARD'], ['KING','Habitación King',65000,'DEMO_STANDARD'],
    ['DLX','Habitación Deluxe',85000,'DEMO_DELUXE'], ['SUITE','Suite',120000,'DEMO_SUITE'],
  ].map(([code,name,minor,plan], index) => ({ roomTypeId: `171ca5a1-744a-4cb1-95a9-00000000000${index+1}`, roomTypeCode: String(code), roomTypeName: String(name), ratePlanId: String(plan), ratePlanCode: String(plan), availableUnits: 4, nightlyRateMinor: Number(minor), totalMinor: Number(minor)*2 })),
};

import type { PublicAvailabilityResponseDTO } from '@/modules/availability';

export const publicPropertyId = 'f4580870-6523-4b8b-a5d5-b0b20710b184';
export const publicRoomTypeId = '6d681515-3e7f-4bfe-89ab-05e002d9d23b';
export const backendAvailability: PublicAvailabilityResponseDTO = {
  propertyId: publicPropertyId, arrival: '2026-11-01', departure: '2026-11-03', currency: 'GTQ',
  offers: [{ roomTypeId: publicRoomTypeId, roomTypeCode: 'DLX', roomTypeName: 'Deluxe real',
    ratePlanId: 'DEMO_DELUXE', ratePlanCode: 'DEMO_DELUXE', availableUnits: 2,
    nightlyRateMinor: 85000, totalMinor: 170000 }],
};

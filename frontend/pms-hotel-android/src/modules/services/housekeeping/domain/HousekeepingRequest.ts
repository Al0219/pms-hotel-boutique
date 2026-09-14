/**
 * Interim values accepted by the frontend request while QA exercises its local
 * mock catalogue. They are not Backend enums or approved hotel options.
 */
export type HousekeepingTimeSlot =
  | '09:00–10:00'
  | '10:00–11:00'
  | '11:00–12:00'
  | '14:00–15:00';

export type HousekeepingCleaningType =
  | 'FULL_CLEANING'
  | 'LIGHT_CLEANING'
  | 'TOWELS_AND_AMENITIES';

export interface HousekeepingRequest {
  timeSlot: HousekeepingTimeSlot;
  cleaningType: HousekeepingCleaningType;
  notes?: string;
}

/**
 * The union retains provisional mock/QA values. Real MVP accepts only
 * 10:00–11:00 and FULL_CLEANING; additional values are not hotel catalogue approval.
 */
export type HousekeepingTimeSlot =
  | '09:00–10:00'
  | '10:00–11:00'
  | '11:00–12:00'
  | '12:00–13:00'
  | '14:00–15:00';

export type HousekeepingCleaningType =
  | 'FULL_CLEANING'
  | 'LIGHT_CLEANING';

export interface HousekeepingRequest {
  serviceDate: string;
  timeSlot: HousekeepingTimeSlot;
  cleaningType: HousekeepingCleaningType;
  notes?: string;
}

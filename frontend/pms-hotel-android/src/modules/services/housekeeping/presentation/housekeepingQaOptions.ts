import {
  type HousekeepingCleaningType,
  type HousekeepingTimeSlot,
} from '@/modules/services/housekeeping/domain/HousekeepingRequest';

/**
 * Temporary frontend-only examples for manual QA. Product and WEB-3 must
 * replace these lists when the hotel catalogue is confirmed.
 */
export const housekeepingQaTimeSlots: readonly HousekeepingTimeSlot[] = [
  '09:00–10:00',
  '10:00–11:00',
  '11:00–12:00',
  '14:00–15:00',
];

export const housekeepingQaCleaningTypes: readonly {
  value: HousekeepingCleaningType;
  label: string;
}[] = [
  { value: 'FULL_CLEANING', label: 'Limpieza completa' },
  { value: 'LIGHT_CLEANING', label: 'Limpieza ligera' },
];

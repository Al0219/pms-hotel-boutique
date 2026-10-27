import {
  type HousekeepingCleaningType,
  type HousekeepingTimeSlot,
} from '@/modules/services/housekeeping/domain/HousekeepingRequest';

/**
 * The five slots are authorized for the real MVP; this is not an administrative hotel catalogue.
 * Additional cleaning types remain frontend/mock QA examples.
 */
export const housekeepingQaTimeSlots: readonly HousekeepingTimeSlot[] = [
  '09:00–10:00',
  '10:00–11:00',
  '11:00–12:00',
  '12:00–13:00',
  '14:00–15:00',
];

export const housekeepingQaCleaningTypes: readonly {
  value: HousekeepingCleaningType;
  label: string;
}[] = [
  { value: 'FULL_CLEANING', label: 'Limpieza completa' },
  { value: 'LIGHT_CLEANING', label: 'Limpieza ligera' },
];

export const MIN_TRANSFER_LEAD_TIME_MINUTES = 30;

export interface TransferScheduleValidationInput {
  now: Date;
  scheduledAt: Date;
  minimumLeadMinutes?: number;
}

export function getMinimumTransferDateTime(
  now: Date,
  minimumLeadMinutes = MIN_TRANSFER_LEAD_TIME_MINUTES,
): Date {
  return new Date(now.getTime() + (minimumLeadMinutes * 60 * 1000));
}

export function isTransferScheduleValid({
  now,
  scheduledAt,
  minimumLeadMinutes = MIN_TRANSFER_LEAD_TIME_MINUTES,
}: TransferScheduleValidationInput): boolean {
  return scheduledAt.getTime() >= getMinimumTransferDateTime(now, minimumLeadMinutes).getTime();
}

export function startOfTransferDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function replaceTransferDate(scheduledAt: Date, selectedDate: Date): Date {
  return new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    scheduledAt.getHours(),
    scheduledAt.getMinutes(),
    scheduledAt.getSeconds(),
    scheduledAt.getMilliseconds(),
  );
}

export function replaceTransferTime(scheduledAt: Date, selectedTime: Date): Date {
  return new Date(
    scheduledAt.getFullYear(),
    scheduledAt.getMonth(),
    scheduledAt.getDate(),
    selectedTime.getHours(),
    selectedTime.getMinutes(),
    selectedTime.getSeconds(),
    selectedTime.getMilliseconds(),
  );
}

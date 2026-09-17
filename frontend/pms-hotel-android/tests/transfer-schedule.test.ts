import {
  getMinimumTransferDateTime,
  isTransferScheduleValid,
  MIN_TRANSFER_LEAD_TIME_MINUTES,
  replaceTransferDate,
  replaceTransferTime,
} from '@/modules/valet/domain/services/TransferSchedule';

describe('Transfer schedule rule', () => {
  const now = new Date(2026, 8, 11, 15, 20, 0);

  it('uses the approved 30-minute minimum lead time', () => {
    expect(MIN_TRANSFER_LEAD_TIME_MINUTES).toBe(30);
    expect(getMinimumTransferDateTime(now)).toEqual(new Date(2026, 8, 11, 15, 50, 0));
  });

  it('accepts exactly thirty minutes and rejects twenty-nine minutes', () => {
    expect(isTransferScheduleValid({ now, scheduledAt: new Date(2026, 8, 11, 15, 50, 0) })).toBe(true);
    expect(isTransferScheduleValid({ now, scheduledAt: new Date(2026, 8, 11, 15, 49, 0) })).toBe(false);
  });

  it('accepts thirty-one minutes and an early time on the following day', () => {
    expect(isTransferScheduleValid({ now, scheduledAt: new Date(2026, 8, 11, 15, 51, 0) })).toBe(true);
    expect(isTransferScheduleValid({ now, scheduledAt: new Date(2026, 8, 12, 8, 0, 0) })).toBe(true);
  });

  it('handles the minimum across midnight using a combined Date value', () => {
    const nearMidnight = new Date(2026, 8, 11, 23, 50, 0);
    expect(getMinimumTransferDateTime(nearMidnight)).toEqual(new Date(2026, 8, 12, 0, 20, 0));
    expect(isTransferScheduleValid({ now: nearMidnight, scheduledAt: new Date(2026, 8, 11, 23, 59, 0) })).toBe(false);
    expect(isTransferScheduleValid({ now: nearMidnight, scheduledAt: new Date(2026, 8, 12, 0, 10, 0) })).toBe(false);
    expect(isTransferScheduleValid({ now: nearMidnight, scheduledAt: new Date(2026, 8, 12, 0, 20, 0) })).toBe(true);
  });

  it('replaces date and time without parsing presentation strings', () => {
    const scheduledAt = new Date(2026, 8, 11, 15, 50, 0);
    expect(replaceTransferDate(scheduledAt, new Date(2026, 8, 12))).toEqual(new Date(2026, 8, 12, 15, 50, 0));
    expect(replaceTransferTime(scheduledAt, new Date(2026, 8, 11, 18, 30))).toEqual(new Date(2026, 8, 11, 18, 30, 0));
  });
});

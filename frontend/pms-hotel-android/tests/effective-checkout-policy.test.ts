import { canCancelLateCheckoutRequest, canCompleteServiceRequest, canRequestLateCheckout, getEffectiveCheckoutAt, getGuestStayActionStatus, getLateCheckoutCancellationBlockReason, getServiceCompletionReminderAt, isServiceWithinEffectiveCheckout } from '@/modules/service-requests';
import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';

const at = (hour: number, minute = 0) => new Date(2026, 8, 18, hour, minute).getTime();
const late: SessionServiceRequest = { sessionRequestId: 'late', kind: 'LATE_CHECKOUT', origin: 'SERVICES', status: 'REQUESTED', title: 'Late check-out', createdAtMs: 0, details: { type: 'LATE_CHECKOUT', serviceDate: '2026-09-18', checkoutUntil: '14:00' } };
const roomService: SessionServiceRequest = { sessionRequestId: 'room-service', kind: 'ROOM_SERVICE', origin: 'SERVICES', status: 'REQUESTED', title: 'Room Service', createdAtMs: 0, details: { type: 'ROOM_SERVICE', serviceDate: '2026-09-18', deliveryTime: '13:00', items: [] } };

describe('effective local checkout policy', () => {
  it('keeps normal checkout inclusive and applies a late extension', () => {
    expect(isServiceWithinEffectiveCheckout({ arrival: '2026-08-28', effectiveCheckoutAtMs: at(12), nowMs: at(8), serviceDate: '2026-09-18', startTime: '12:00' })).toBe(true);
    expect(isServiceWithinEffectiveCheckout({ arrival: '2026-08-28', effectiveCheckoutAtMs: at(12), nowMs: at(8), serviceDate: '2026-09-18', startTime: '12:01' })).toBe(false);
    expect(getEffectiveCheckoutAt({ departure: '2026-09-18' }, [late])).toBe(at(14));
    expect(isServiceWithinEffectiveCheckout({ arrival: '2026-08-28', effectiveCheckoutAtMs: at(14), nowMs: at(8), serviceDate: '2026-09-18', startTime: '14:00' })).toBe(true);
  });

  it('enforces the 35-minute request cutoff and resolves late cancellation blocks by priority', () => {
    expect(canRequestLateCheckout('2026-09-18', at(11, 25))).toBe(true);
    expect(canRequestLateCheckout('2026-09-18', at(11, 26))).toBe(false);
    expect(canCancelLateCheckoutRequest(late, at(11, 29))).toBe(true);
    expect(canCancelLateCheckoutRequest(late, at(11, 30))).toBe(false);
    expect(canCancelLateCheckoutRequest(late, at(11, 29), [late, roomService])).toBe(false);
    expect(getLateCheckoutCancellationBlockReason(late, at(11, 29), [late])).toBeNull();
    expect(getLateCheckoutCancellationBlockReason(late, at(11, 30), [late])).toBe('CANCELLATION_CUTOFF');
    expect(getLateCheckoutCancellationBlockReason(late, at(11), [late, roomService])).toBe('DEPENDENT_SERVICE_AFTER_NORMAL_CHECKOUT');
    expect(getLateCheckoutCancellationBlockReason(late, at(11, 31), [late, roomService])).toBe('DEPENDENT_SERVICE_AFTER_NORMAL_CHECKOUT');
    expect(getLateCheckoutCancellationBlockReason(late, at(11), [late, { ...roomService, details: { type: 'ROOM_SERVICE', serviceDate: '2026-09-18', deliveryTime: '12:00', items: [] } }])).toBeNull();
    expect(getLateCheckoutCancellationBlockReason(late, at(11), [late, { ...roomService, status: 'COMPLETED' }])).toBeNull();
  });

  it('never completes late checkout and derives a ten-minute reminder from eligible services', () => {
    expect(canCompleteServiceRequest(late, at(14))).toBe(false);
    expect(getServiceCompletionReminderAt(late)).toBeNull();
    expect(getServiceCompletionReminderAt(roomService)).toBe(at(13, 10));
  });

  it('derives ACTIVE, CHECKOUT_DUE and CHECKED_OUT with snapshot priority', () => {
    const stay = { departure: '2026-09-18' };
    expect(getGuestStayActionStatus({ isCheckedOut: false, nowMs: at(11, 59), requests: [], stay })).toBe('ACTIVE');
    expect(getGuestStayActionStatus({ isCheckedOut: false, nowMs: at(12), requests: [], stay })).toBe('CHECKOUT_DUE');
    expect(getGuestStayActionStatus({ isCheckedOut: false, nowMs: at(12), requests: [late], stay })).toBe('ACTIVE');
    expect(getGuestStayActionStatus({ isCheckedOut: false, nowMs: at(13, 59), requests: [late], stay })).toBe('ACTIVE');
    expect(getGuestStayActionStatus({ isCheckedOut: false, nowMs: at(14), requests: [late], stay })).toBe('CHECKOUT_DUE');
    expect(getGuestStayActionStatus({ isCheckedOut: true, nowMs: at(15), requests: [], stay })).toBe('CHECKED_OUT');
  });
});

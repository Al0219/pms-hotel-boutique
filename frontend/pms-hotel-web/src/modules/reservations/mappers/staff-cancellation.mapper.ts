import { DomainMappingError } from '@/lib/errors';
import { isUtcInstant } from '@/lib/utc-instant';
import type { StaffCancellationFinanceDto, StaffCancellationPreviewDto, StaffCancellationResultDto } from '../dtos/staff-cancellation.dto';
import type { CancellationFinance, CancellationPreview, CancellationReceipt, CancellationScope } from '../model/staff-cancellation';

const policy = 'STAFF_PRE_ARRIVAL_TEN_PERCENT_V1';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const valid = (condition: unknown): void => { if (!condition) throw new DomainMappingError('INVALID_STAFF_CANCELLATION'); };
export function mapCancellationFinance(f: StaffCancellationFinanceDto): CancellationFinance {
  valid(f && uuid(f.folioId) && /^[A-Z]{3}$/.test(f.currency));
  valid([f.accommodationMinor, f.paidMinor, f.penaltyMinor, f.balanceAfterMinor, f.dueMinor, f.creditMinor].every(Number.isSafeInteger));
  valid(f.accommodationMinor > 0 && f.paidMinor >= 0 && f.penaltyMinor >= 0 && f.penaltyMinor <= f.accommodationMinor
    && f.balanceAfterMinor === f.penaltyMinor - f.paidMinor && f.dueMinor === Math.max(0, f.balanceAfterMinor)
    && f.creditMinor === Math.max(0, -f.balanceAfterMinor));
  return { folioId: f.folioId, currency: f.currency, accommodationMinor: f.accommodationMinor, paidMinor: f.paidMinor,
    penaltyMinor: f.penaltyMinor, balanceAfterMinor: f.balanceAfterMinor, dueMinor: f.dueMinor, creditMinor: f.creditMinor };
}
export function mapCancellationReceipt(r: StaffCancellationResultDto, scope: CancellationScope): CancellationReceipt {
  valid(r && r.propertyId === scope.propertyId && r.reservationId === scope.reservationId && uuid(r.operationId)
    && r.status === 'CANCELLED' && r.policyCode === policy && isUtcInstant(r.completedAt)
    && Number.isSafeInteger(r.staysCancelled) && r.staysCancelled > 0
    && typeof r.reason === 'string' && r.reason.trim().length > 0 && r.reason.length <= 255 && !r.reason.includes('\0'));
  return { ...scope, operationId: r.operationId, completedAt: r.completedAt, staysCancelled: r.staysCancelled,
    financial: mapCancellationFinance(r.financial), reason: r.reason };
}
export function mapCancellationPreview(p: StaffCancellationPreviewDto, scope: CancellationScope): CancellationPreview {
  valid(p && p.propertyId === scope.propertyId && p.reservationId === scope.reservationId && p.policyCode === policy
    && p.penaltyPercent === 10 && typeof p.confirmationCode === 'string' && p.confirmationCode.length > 0
    && typeof p.canCancel === 'boolean' && Number.isSafeInteger(p.stayCount) && p.stayCount >= 0);
  valid(p.canCancel ? p.stayCount > 0 && p.blockingCode === null && typeof p.fingerprint === 'string'
    && /^[a-f0-9]{64}$/.test(p.fingerprint) && p.financial !== null && p.completed === null
    : typeof p.blockingCode === 'string' && p.blockingCode.length > 0 && p.fingerprint === null && p.financial === null);
  valid(p.completed === null || !p.canCancel && p.blockingCode === 'ALREADY_CANCELLED');
  return { ...scope, confirmationCode: p.confirmationCode, penaltyPercent: p.penaltyPercent, canCancel: p.canCancel,
    blockingCode: p.blockingCode, fingerprint: p.fingerprint, stayCount: p.stayCount,
    financial: p.financial === null ? null : mapCancellationFinance(p.financial),
    completed: p.completed === null ? null : mapCancellationReceipt(p.completed, scope) };
}

import { staffBffRead, staffBffRequest } from '@/lib/http/staff-bff';
import type { StaffFolioPageDto, StaffFolioDetailDto, StaffMovementPageDto, StaffPaymentReceiptDto, ReceivedPaymentDto } from '../dtos/staff-folio.dto';
import type { ReceivedPayment } from '../model/staff-folio';

function path(propertyId: string, suffix = '', params: Record<string, string> = {}) {
  return `/api/staff/folios${suffix}?${new URLSearchParams({ propertyId, ...params })}`;
}
export const readStaffFolios = (propertyId: string, reservationId: string, cursor?: string, signal?: AbortSignal) =>
  staffBffRead<StaffFolioPageDto>(path(propertyId, '', { reservationId, ...(cursor ? { cursor } : {}) }), signal);
export const readStaffFolio = (propertyId: string, folioId: string, signal?: AbortSignal) =>
  staffBffRead<StaffFolioDetailDto>(path(propertyId, `/${encodeURIComponent(folioId)}`), signal);
export const readStaffMovements = (propertyId: string, folioId: string, cursor?: string, signal?: AbortSignal) =>
  staffBffRead<StaffMovementPageDto>(path(propertyId, `/${encodeURIComponent(folioId)}/movements`, cursor ? { cursor } : {}), signal);
export const recordStaffPayment = (propertyId: string, folioId: string, payment: ReceivedPayment, key: string, signal?: AbortSignal) => {
  const dto: ReceivedPaymentDto = { amount: { amount: payment.amount.amount, currency: payment.amount.currency }, description: payment.description };
  return staffBffRequest<StaffPaymentReceiptDto>(path(propertyId, `/${encodeURIComponent(folioId)}/payments`), {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(dto), signal,
  });
};

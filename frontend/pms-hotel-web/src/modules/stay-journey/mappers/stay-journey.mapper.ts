import { DomainMappingError } from '@/lib/errors';
import type { JourneyDocument, JourneyRequest, JourneySummary, SimulatedPaymentReceipt } from '../model/stay-journey';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function fail(): never { throw new DomainMappingError('INVALID_STAY_JOURNEY'); }
function obj(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail(); }
function text(v: unknown): string { return typeof v === 'string' && v.trim() ? v : fail(); }
function id(v: unknown): string { const s = text(v); return uuid.test(s) ? s : fail(); }
function time(v: unknown): string { const s = text(v); return Number.isFinite(Date.parse(s)) ? s : fail(); }
function money(v: unknown): string { const s = text(v); return /^-?\d{1,17}\.\d{2}$/.test(s) ? s : fail(); }
function count(v: unknown): number { return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : fail(); }
function array(v: unknown): unknown[] { return Array.isArray(v) ? v : fail(); }
export function mapJourneyRequests(v: unknown): JourneyRequest[] {
  return array(v).map(value => { const r = obj(value); if (!['CHECK_IN', 'CHECK_OUT'].includes(String(r.kind)) || !['OPEN', 'DONE'].includes(String(r.status))) fail();
    return { id: id(r.id), kind: r.kind as JourneyRequest['kind'], status: r.status as JourneyRequest['status'], createdAt: time(r.createdAt), completedAt: r.completedAt === null ? null : time(r.completedAt) }; });
}
export function mapJourneySummary(v: unknown, property: string, reservation: string, stayId: string): JourneySummary {
  const r = obj(v), s = obj(r.stay);
  if (s.propertyId !== property || s.reservationId !== reservation || s.stayId !== stayId || r.currency !== 'GTQ' || typeof r.verifiable !== 'boolean') fail();
  if (r.disclaimer !== 'Documento informativo — sin validez fiscal') fail();
  return { stay: { propertyId: id(s.propertyId), reservationId: id(s.reservationId), stayId: id(s.stayId), confirmationCode: text(s.confirmationCode), status: text(s.status), updatedAt: time(s.updatedAt), roomId: s.roomId === null ? null : id(s.roomId), arrival: text(s.arrival), departure: text(s.departure), timezone: text(s.timezone) },
    folioId: id(r.folioId), currency: 'GTQ', balance: money(r.balance), charges: money(r.charges), payments: money(r.payments), adjustments: money(r.adjustments), verifiable: r.verifiable, pendingOrders: count(r.pendingOrders), unpostedOrders: count(r.unpostedOrders), documentId: r.documentId === null ? null : id(r.documentId), disclaimer: r.disclaimer,
    requests: mapJourneyRequests(r.requests), movements: array(r.movements).map(value => { const m = obj(value); if (!['CHARGE', 'PAYMENT', 'ADJUSTMENT'].includes(String(m.kind))) fail();
      return { id: id(m.id), kind: m.kind as JourneySummary['movements'][number]['kind'], description: text(m.description), amount: money(m.amount), createdAt: time(m.createdAt) }; }) };
}
export function mapJourneyDocument(v: unknown, property: string, reservation: string, stay: string): JourneyDocument {
  const r = obj(v); return { id: id(r.id), issuedAt: time(r.issuedAt), snapshot: mapJourneySummary(r.snapshot, property, reservation, stay) };
}
export function mapSimulatedReceipt(v: unknown): SimulatedPaymentReceipt {
  const r = obj(v); if (!['APPROVED', 'DECLINED', 'ERROR'].includes(String(r.result)) || r.currency !== 'GTQ' || (r.result === 'APPROVED') !== (r.movementId !== null)) fail();
  return { operationId: id(r.operationId), folioId: id(r.folioId), result: r.result as SimulatedPaymentReceipt['result'], amount: money(r.amount), currency: 'GTQ', movementId: r.movementId === null ? null : id(r.movementId), completedAt: time(r.completedAt) };
}

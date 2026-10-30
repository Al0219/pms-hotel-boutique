import type { JourneySummary, JourneyDocument, SimulatedPaymentReceipt } from '@/modules/stay-journey';
export const propertyId = '11111111-1111-4111-8111-111111111111', reservationId = '22222222-2222-4222-8222-222222222222', stayId = '33333333-3333-4333-8333-333333333333', folioId = '44444444-4444-4444-8444-444444444444';
export const context = { propertyId, reservationId, stayId };
export const summary = (): JourneySummary => ({ stay: { ...context, confirmationCode: 'JOURNEY-QA', status: 'IN_HOUSE', updatedAt: '2026-10-29T18:00:00.123456Z', roomId: null, arrival: '2026-10-28', departure: '2026-10-31', timezone: 'America/Guatemala' }, folioId, currency: 'GTQ', balance: '100.00', charges: '100.00', payments: '0.00', adjustments: '0.00', verifiable: true, pendingOrders: 0, unpostedOrders: 0, documentId: null, disclaimer: 'Documento informativo — sin validez fiscal', requests: [], movements: [{ id: folioId, kind: 'CHARGE', amount: '100.00', description: 'Alojamiento', createdAt: '2026-10-29T18:00:00Z' }] });
export const receipt = (): SimulatedPaymentReceipt => ({ operationId: stayId, folioId, result: 'APPROVED', amount: '30.00', currency: 'GTQ', movementId: propertyId, completedAt: '2026-10-29T18:05:00Z' });
export const document = (): JourneyDocument => ({ id: reservationId, issuedAt: '2026-10-29T19:00:00Z', snapshot: { ...summary(), balance: '0.00', payments: '100.00' } });

export const documentFileFixture=()=>({documentId:document().id,pdfBase64:'JVBERi0xLjQKJSBmaXh0dXJl',sha256:'a'.repeat(64),createdAt:document().issuedAt});

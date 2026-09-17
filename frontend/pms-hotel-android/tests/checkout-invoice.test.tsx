import { mapCheckoutFixtureDto, mapFolioFixtureDto, mapInvoiceFixtureDto } from '@/modules/checkout/data/mappers/mapCheckoutFixtureDto';
import { checkoutFixture, folioFixture, invoiceFixture } from '@/modules/checkout/data/mocks/checkoutFixtures';
import { buildCheckoutSessionReadModel, MockCheckoutService } from '@/modules/checkout';
import { mapReservationStayDto, type ReservationStayDto } from '@/modules/stay';
import { initialSessionServiceRequestsState, sessionServiceRequestsReducer, type SessionServiceRequest } from '@/modules/service-requests';
import { buildLateCheckoutSessionRequestInput } from '@/modules/services';
import { buildRoomServiceSessionRequestInput } from '@/modules/services/room-service';
import { buildTransferSessionRequestInput } from '@/modules/valet';

declare const require: (moduleName: string) => { readFileSync(path: string, encoding: string): string };

describe('Checkout / Invoice — IMP-AND-0203', () => {
  it('maps the approved presentation fixtures without financial parsing', () => {
    const folio = mapFolioFixtureDto(folioFixture);
    expect(folio.totalStayText).toBe('Total estadía · Q 3,920');
    expect(folio.items.map((item) => item.priceText)).toEqual(['Q 3,150', 'Q 280', 'Q 110', 'Q 280', 'Q 100']);
    expect(typeof folio.items[0]?.priceText).toBe('string');
    expect(mapCheckoutFixtureDto(checkoutFixture).checks).toHaveLength(5);
    expect(mapInvoiceFixtureDto(invoiceFixture)).toMatchObject({ referenceText: 'FEL-0842 · HB-2026-08421', statusText: 'CERTIFICADA', totalText: 'Total · Q 3,920', dateText: 'Fecha · 31 ago · 10:48' });
  });

  it('keeps inconsistent price display text unchanged rather than recalculating it', () => {
    const folio = mapFolioFixtureDto({ ...folioFixture, items: [{ fixtureKey: 'display', label: 'Display', priceText: 'Q no calculado' }] });
    expect(folio.items[0]?.priceText).toBe('Q no calculado');
  });

  it('submits only an optional trimmed departure note and returns mock completion', async () => {
    const sent: unknown[] = [];
    const service = new MockCheckoutService({ submitCheckout: async (input) => { sent.push(input); return { completed: true }; } });
    await expect(service.submitCheckout({ departureNoteText: 'Nota' })).resolves.toEqual({ completed: true });
    await expect(service.submitCheckout({})).resolves.toEqual({ completed: true });
    expect(sent).toEqual([{ departureNoteText: 'Nota' }, {}]);
  });

  it('contains no financial calculation, backend transport, document storage, or child shell', () => {
    const fs = require('fs');
    const sources = ['src/modules/checkout/domain/Checkout.ts', 'src/modules/checkout/data/mappers/mapCheckoutFixtureDto.ts', 'src/modules/checkout/presentation/CheckoutScreen.tsx', 'src/modules/checkout/presentation/InvoiceScreen.tsx'].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    for (const prohibited of ['parseFloat', 'Number(', 'axios', 'expo-file-system', 'shareAsync', 'PaymentMethod', 'FiscalDocument']) expect(sources).not.toContain(prohibited);
    expect(sources).not.toMatch(/\bfetch\s*\(/);
    expect(sources).not.toContain('GuestNavigationShell');
  });

  it('keeps deprecated simulation and placeholder copy out of Guest presentation sources', () => {
    const fs = require('fs');
    const sources = [
      'src/modules/checkout/presentation/CheckoutScreen.tsx',
      'src/modules/checkout/presentation/InvoiceScreen.tsx',
      'src/modules/hotel/data/mocks/hotelProfileFixture.ts',
    ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    for (const prohibited of [
      'Resumen simulado',
      'PDF simulado',
      'Envío simulado',
      'Datos de demostración',
      '+502 0000-0000',
      'hotel-demo',
      'Dirección de demostración',
    ]) expect(sources).not.toContain(prohibited);
  });

  it('declares the approved routes, stable back targets, and replacement success navigation', () => {
    const fs = require('fs');
    const checkout = fs.readFileSync('src/modules/checkout/presentation/CheckoutScreen.tsx', 'utf8');
    const invoice = fs.readFileSync('src/modules/checkout/presentation/InvoiceScreen.tsx', 'utf8');
    const account = fs.readFileSync('src/modules/account/presentation/AccountStayHubScreen.tsx', 'utf8');
    expect(account).toContain("router.push(isCheckedOut ? '/account/invoice' : '/account/checkout')");
    expect(checkout).toContain("router.replace('/account/invoice')");
    expect(checkout).toContain("router.dismissTo('/account')");
    expect(invoice).toContain("router.dismissTo('/account')");
  });
});

const stayDto: ReservationStayDto = { id: 'stay-test', reservationId: 'res', arrival: '2026-08-28', departure: '2026-08-31', status: 'REMOTE_STATUS', room: { id: 'room-203', number: '203' }, roomType: { id: 'suite', name: 'Suite Terraza' } };
const stay = mapReservationStayDto(stayDto);
const billable = (id: string, label: string, priceText: string): SessionServiceRequest => ({ sessionRequestId: id, kind: 'ROOM_SERVICE', origin: 'SERVICES', status: 'REQUESTED', title: 'Room Service', createdAtMs: 1, details: { type: 'ROOM_SERVICE', items: [], deliveryTime: '10:00' }, billingSnapshot: { label, priceText, lineItems: [{ label, quantity: 1, priceText }] } });

describe('Checkout session-backed read model', () => {
  it('keeps multiple request snapshots independent and never uses a fixture folio', () => {
    const result = buildCheckoutSessionReadModel(stay, [billable('a', 'Café x2', 'Q 40'), billable('b', 'Jugo x1', 'Q 25')]);
    expect(result.folio.items).toEqual([
      { key: 'a', label: 'Café x2', priceText: 'Q 40', lineItems: [{ label: 'Café x2', quantity: 1, priceText: 'Q 40' }] },
      { key: 'b', label: 'Jugo x1', priceText: 'Q 25', lineItems: [{ label: 'Jugo x1', quantity: 1, priceText: 'Q 25' }] },
    ]);
    expect(result.folio.totalText).toBe('Total · Q0.00');
  });
  it('omits non-billable requests and shows the honest zero-charge data state', () => {
    const nonBillable: SessionServiceRequest = { sessionRequestId: 'hk', kind: 'HOUSEKEEPING', origin: 'SERVICES', status: 'REQUESTED', title: 'Limpieza', createdAtMs: 1, details: { type: 'HOUSEKEEPING', cleaningType: 'FULL_CLEANING', timeSlot: '10:00–11:00' } };
    expect(buildCheckoutSessionReadModel(stay, [nonBillable]).folio).toMatchObject({ items: [], totalStayText: 'Sin cargos registrados en esta sesión' });
  });
  it('derives presentation from the public stay and preserves nullable room', () => {
    expect(buildCheckoutSessionReadModel({ ...stay, room: null }, []).content.roomDisplayText).toBe('Habitación por asignar');
    expect(buildCheckoutSessionReadModel(stay, []).content.roomDisplayText).toContain('203');
  });
});


describe('Billing snapshot reducer regressions', () => {
  const request = billable('one', 'Café x2', 'Q 40');
  it('preserves the snapshot across metadata update and status completion', () => {
    const created = sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request });
    const updated = sessionServiceRequestsReducer(created, { type: 'UPDATE_REQUEST', sessionRequestId: 'one', request: { ...request, summary: '10:30', details: { type: 'ROOM_SERVICE', items: [], deliveryTime: '10:30' } } });
    const completed = sessionServiceRequestsReducer(updated, { type: 'COMPLETE_REQUEST', sessionRequestId: 'one' });
    expect(completed.requests[0]).toMatchObject({ sessionRequestId: 'one', status: 'COMPLETED', billingSnapshot: request.billingSnapshot, details: { type: 'ROOM_SERVICE', deliveryTime: '10:30' } });
  });
  it('removes deleted billable entries from the session read model', () => {
    const created = sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request });
    const removed = sessionServiceRequestsReducer(created, { type: 'REMOVE_REQUEST', sessionRequestId: 'one' });
    expect(buildCheckoutSessionReadModel(stay, removed.requests).folio.items).toEqual([]);
  });
});


describe('Producer builder integration', () => {
  const createMenu = () => ({ items: [{ fixtureKey: 'coffee', category: 'Bebidas' as const, name: 'Café', priceAmount: 20 }, { fixtureKey: 'juice', category: 'Bebidas' as const, name: 'Jugo', priceAmount: 25 }] });
  const register = (input: SessionServiceRequest) => sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request: input });
  it('freezes Room Service snapshots through the producer builder', () => { const menu = createMenu(); const input = buildRoomServiceSessionRequestInput({ cart: { items: [{ itemFixtureKey: 'coffee', quantity: 2 }] }, deliveryTime: '10:00', menu, serviceDate: '2026-08-30', summary: 'Pedido A' }); const state = register({ ...input, sessionRequestId: 'a', createdAtMs: 1 }); menu.items[0]!.priceAmount = 99; expect(buildCheckoutSessionReadModel(stay, state.requests).folio.items).toEqual([{ key: 'a', label: 'Room Service', priceText: 'Q 40', lineItems: [{ label: 'Café', quantity: 2, priceText: 'Q 20' }], amountNature: 'CONFIRMED' }]); expect(state.requests[0]!.billingSnapshot).toMatchObject({ amountMinor: 4000, amountNature: 'CONFIRMED', currency: 'GTQ' }); });
  it('keeps source builders separate and excludes non-billable requests', () => { const menu = createMenu(); const room = buildRoomServiceSessionRequestInput({ cart: { items: [{ itemFixtureKey: 'juice', quantity: 1 }] }, deliveryTime: '10:00', menu, serviceDate: '2026-08-30', summary: 'Pedido B' }); const late = buildLateCheckoutSessionRequestInput({ checkoutUntil: '14:00', priceAmount: 180, priceText: 'Q 180', serviceDate: '2026-08-31', summary: 'Late', title: 'Late check-out' }); const transfer = buildTransferSessionRequestInput({ destinationKey: 'airport', estimatedAmount: 120, fareText: 'Q 120', passengers: 2, scheduledAtMs: 1, summary: 'Transfer' }); const state = [room, late, transfer].reduce((current, input, index) => sessionServiceRequestsReducer(current, { type: 'ADD_REQUEST', request: { ...input, sessionRequestId: `r${index}`, createdAtMs: index } }), initialSessionServiceRequestsState); expect(buildCheckoutSessionReadModel(stay, state.requests).folio.items).toHaveLength(3); });
  it('adds the estimated Transfer to the checkout total without parsing display money', () => {
    const menu = { items: [{ fixtureKey: 'coffee', category: 'Bebidas' as const, name: 'Café', priceAmount: 200 }] };
    const room = buildRoomServiceSessionRequestInput({ cart: { items: [{ itemFixtureKey: 'coffee', quantity: 1 }] }, deliveryTime: '10:00', menu, serviceDate: '2026-08-30', summary: 'Pedido' });
    const late = buildLateCheckoutSessionRequestInput({ checkoutUntil: '14:00', priceAmount: 100, priceText: 'Q 100', serviceDate: '2026-08-31', summary: 'Late', title: 'Late check-out' });
    const transfer = buildTransferSessionRequestInput({ destinationKey: 'airport', estimatedAmount: 150, fareText: 'Q 150', passengers: 2, scheduledAtMs: 1, summary: 'Transfer' });
    const state = [room, late, transfer].reduce((current, input, index) => sessionServiceRequestsReducer(current, { type: 'ADD_REQUEST', request: { ...input, sessionRequestId: `r${index}`, createdAtMs: index } }), initialSessionServiceRequestsState);
    const folio = buildCheckoutSessionReadModel(stay, state.requests).folio;
    expect(folio.checkoutTotal).toEqual({ amountMinor: 45000, currency: 'GTQ', text: 'Total · Q450.00' });
    expect(folio.items.find((item) => item.amountNature === 'ESTIMATED')).toMatchObject({ label: 'Traslado · tarifa estimada', priceText: 'Q 150' });
  });

  it('uses an estimated Transfer as the total when it is the only billable entry', () => {
    const transfer = buildTransferSessionRequestInput({ destinationKey: 'airport', estimatedAmount: 150, fareText: 'Q 150', passengers: 2, scheduledAtMs: 1, summary: 'Transfer' });
    const folio = buildCheckoutSessionReadModel(stay, [{ ...transfer, sessionRequestId: 'transfer', createdAtMs: 1 }]).folio;
    expect(folio.checkoutTotal).toEqual({ amountMinor: 15000, currency: 'GTQ', text: 'Total · Q150.00' });
  });
});

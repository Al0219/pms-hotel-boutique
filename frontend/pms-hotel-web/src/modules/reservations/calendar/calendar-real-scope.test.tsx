import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { CalendarGantt } from './calendar-gantt';
import { toDayKey } from './calendar-gantt-model';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it('reloads scoped real data on property changes and hides the cached prior property while reads are pending', async () => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
  const reservation = staffReservationFixture();
  const inventory = staffInventoryFixture();
  const propertyA = reservation.propertyId, propertyB = '99999999-9999-9999-9999-999999999999';
  const today = new Date(), end = new Date(today); end.setDate(today.getDate() + 2);
  reservation.stays[0].arrival = toDayKey(today); reservation.stays[0].departure = toDayKey(end);
  let releaseReads = () => {};
  let gate: Promise<void> | undefined;
  const scopes: string[] = [];
  const root = 'http://localhost:3000/api/staff';
  mockServer.use(
    http.get(`${root}/reservations`, async ({ request }) => {
      const propertyId = new URL(request.url).searchParams.get('propertyId')!;
      scopes.push(propertyId);
      await gate;
      return HttpResponse.json([{ ...reservation, propertyId, responsibleGuest: { ...reservation.responsibleGuest!, firstName: propertyId === propertyA ? 'HotelA' : 'HotelB' } }]);
    }),
    http.get(`${root}/rooms`, async ({ request }) => {
      const propertyId = new URL(request.url).searchParams.get('propertyId')!;
      await gate;
      return HttpResponse.json(inventory.rooms.map(room => ({ ...room, propertyId })));
    }),
    http.get(`${root}/room-types`, async ({ request }) => {
      const propertyId = new URL(request.url).searchParams.get('propertyId')!;
      await gate;
      return HttpResponse.json(inventory.types.map(type => ({ ...type, propertyId })));
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = (propertyId: string) => <QueryClientProvider client={client}>
    <CalendarGantt key={propertyId} propertyId={propertyId} sessionId="staff" />
  </QueryClientProvider>;
  const view = render(content(propertyA));
  expect(await screen.findByRole('link', { name: /HotelA/ })).toBeInTheDocument();
  gate = new Promise<void>(resolve => { releaseReads = resolve; });
  view.rerender(content(propertyB));
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByText('Cargando calendario…')).toBeInTheDocument();
  await act(async () => { releaseReads(); });
  expect(await screen.findByRole('link', { name: /HotelB/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /HotelA/ })).not.toBeInTheDocument();
  gate = new Promise<void>(resolve => { releaseReads = resolve; });
  view.rerender(content(propertyA));
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await act(async () => { releaseReads(); });
  expect(await screen.findByRole('link', { name: /HotelA/ })).toBeInTheDocument();
  expect(scopes).toEqual([propertyA, propertyB, propertyA]);
  client.clear();
});

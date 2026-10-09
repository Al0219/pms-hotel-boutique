import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { inventoryPropertyId, staffInventoryFixture, staffReservationFixture } from '@/test/staff-inventory-fixture';
import PrivateLayout from './layout';
import { StaffReservationsWorkspace, StaffRoomsWorkspace } from './staff-property-workspace';

const route = vi.hoisted(() => ({ pathname: '/staff/habitaciones' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'shell-scope' };
const second = '99999999-9999-9999-9999-999999999999';
const clients: QueryClient[] = [];
let reads: string[];
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); reads = [];
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
  mockServer.use(
    http.get('*/api/auth/staff/session', () => HttpResponse.json({ staffUserId: 'staff', sessionId: 'shell-scope', username: 'gerencia.real', roleCode: 'GERENCIA', permissions: ['MULTI_PROPERTY_READ'],
      memberships: [inventoryPropertyId, second].map((propertyId, i) => ({ propertyId, propertyCode: `HOTEL-${i}`, name: `Hotel ${i}`, timezone: 'America/Guatemala', currency: 'GTQ' })) })),
    http.get('*/api/staff/rooms', ({ request }) => {
      reads.push(request.url); const propertyId = new URL(request.url).searchParams.get('propertyId');
      return HttpResponse.json(staffInventoryFixture().rooms.map((room, i) => ({ ...room, propertyId, code: propertyId === second ? String(201 + i) : room.code })));
    }),
    http.get('*/api/staff/room-types', ({ request }) => {
      reads.push(request.url); const propertyId = new URL(request.url).searchParams.get('propertyId');
      return HttpResponse.json(staffInventoryFixture().types.map(type => ({ ...type, propertyId })));
    }),
    http.get('*/api/staff/reservations', ({ request }) => {
      reads.push(request.url); const propertyId = new URL(request.url).searchParams.get('propertyId');
      const reservation = staffReservationFixture();
      return HttpResponse.json([{ ...reservation, propertyId, responsibleGuest: { ...reservation.responsibleGuest, firstName: propertyId === second ? 'Segundo' : 'Primero' } }]);
    }),
  );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
it.each(['rooms', 'reservations'] as const)('sidebar selector refreshes real %s reads and preserves ALL_PROPERTIES gating', async module => {
  const user = userEvent.setup();
  route.pathname = module === 'rooms' ? '/staff/habitaciones' : '/reservas';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><PrivateLayout>
    {module === 'rooms' ? <StaffRoomsWorkspace /> : <StaffReservationsWorkspace />}
  </PrivateLayout></QueryClientProvider></AppRouterContext.Provider>);
  const firstLabel = module === 'rooms' ? /Habitación 101/ : /Primero Responsible/;
  const secondLabel = module === 'rooms' ? /Habitación 201/ : /Segundo Responsible/;
  await screen.findByRole('row', { name: firstLabel });
  expect(screen.getByRole('option', { name: 'Hotel 0' })).toHaveValue(inventoryPropertyId);
  expect(screen.getByLabelText('Propiedad')).toHaveAttribute('title', `Hotel 0 · ${inventoryPropertyId}`);
  await user.selectOptions(screen.getByLabelText('Propiedad'), second);
  expect(screen.queryByRole('row', { name: firstLabel })).not.toBeInTheDocument();
  await screen.findByRole('row', { name: secondLabel });
  await waitFor(() => expect(reads.some(url => new URL(url).searchParams.get('propertyId') === second)).toBe(true));
  expect(sessionStorage.getItem('pms:private-09:scope:shell-scope')).toBe(second);
  await user.selectOptions(screen.getByLabelText('Propiedad'), 'ALL_PROPERTIES');
  expect(screen.getByRole('heading', { name: 'Selecciona una propiedad' })).toBeInTheDocument();
  expect(screen.getByText(/selector del menú Staff/)).toBeInTheDocument();
  expect(screen.queryByRole('row', { name: secondLabel })).not.toBeInTheDocument();
  expect(reads.every(url => [inventoryPropertyId, second].includes(new URL(url).searchParams.get('propertyId') ?? ''))).toBe(true);
});

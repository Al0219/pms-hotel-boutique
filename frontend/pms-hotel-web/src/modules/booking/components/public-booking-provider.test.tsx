import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicPropertyId, publicRoomTypeId } from '@/test/public-availability-fixture';
import { buildSearchQueryParams } from '../domain/booking-search-criteria';
import { publicCartStorageKey, readStoredCart, serializeCart, type PublicCart } from '../domain/public-cart-storage';
import { PublicBookingProvider, usePublicBookingSession } from './public-booking-provider';
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const cart: PublicCart = { scope: `${publicPropertyId}:${buildSearchQueryParams(criteria)}`, propertyId: publicPropertyId,
  items: [{ roomTypeId: publicRoomTypeId, roomTypeCode: 'DLX', ratePlanId: 'DEMO_DELUXE', quantity: 2, currency: 'GTQ', nightlyRateMinor: 85000, totalMinor: 170000 }] };
function Evidence() { const { cart: value, setCart } = usePublicBookingSession(); return <><output data-testid="cart">{JSON.stringify(value)}</output><button onClick={() => setCart(cart)}>Seleccionar</button></>; }
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); });
afterEach(() => vi.unstubAllEnvs());
describe('Public cart session persistence', () => {
  it('persists only selection data and restores real IDs after a reload/OAuth-return remount', async () => {
    const view = render(<PublicBookingProvider><Evidence /></PublicBookingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar' }));
    await waitFor(() => expect(readStoredCart(sessionStorage.getItem(publicCartStorageKey(false)), false)).toEqual(cart));
    view.unmount(); render(<PublicBookingProvider><Evidence /></PublicBookingProvider>);
    expect(JSON.parse(screen.getByTestId('cart').textContent!)).toEqual(cart);
    expect(readStoredCart(serializeCart({ ...cart, guest: { email: 'private@example.test' } } as PublicCart), false)).toEqual(cart);
    expect(serializeCart({ ...cart, guest: { email: 'private@example.test' } } as PublicCart)).not.toContain('private@example');
  });
  it('hydrates persisted data without putting browser state in SSR HTML or causing a mismatch', async () => {
    sessionStorage.setItem(publicCartStorageKey(false), serializeCart(cart));
    const html = renderToString(<PublicBookingProvider><Evidence /></PublicBookingProvider>);
    expect(html).not.toContain(publicRoomTypeId);
    const container = document.createElement('div'); container.innerHTML = html; document.body.append(container);
    const errors: unknown[] = [];
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, <PublicBookingProvider><Evidence /></PublicBookingProvider>, { onRecoverableError: error => errors.push(error) }); });
    expect(container).toHaveTextContent(publicRoomTypeId); expect(errors).toEqual([]);
    await act(async () => root.unmount()); container.remove();
  });
  it('rejects corruption, invalid quantities, duplicate IDs and mock identities in real mode', () => {
    for (const raw of ['broken', JSON.stringify({ version: 9, cart }), serializeCart({ ...cart, items: [{ ...cart.items[0], quantity: -1 }] }), serializeCart({ ...cart, items: [cart.items[0], cart.items[0]] }), serializeCart({ ...cart, items: [{ ...cart.items[0], roomTypeId: 'rt_deluxe_king' }] })]) expect(readStoredCart(raw, false).items).toEqual([]);
  });
  it('keeps mock and real storage separate and still works when storage is unavailable', () => {
    sessionStorage.setItem(publicCartStorageKey(true), serializeCart(cart));
    const spy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    const view = render(<PublicBookingProvider><Evidence /></PublicBookingProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar' })); expect(screen.getByTestId('cart')).toHaveTextContent(publicRoomTypeId);
    view.unmount(); spy.mockRestore(); expect(sessionStorage.getItem(publicCartStorageKey(true))).toBeTruthy();
  });
});

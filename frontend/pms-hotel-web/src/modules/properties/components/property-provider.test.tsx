import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffSession } from '@/modules/auth';
import { PropertyProvider, PropertySwitcher, usePropertyScope } from './property-provider';
const mocks = vi.hoisted(() => { vi.resetModules(); return { session: vi.fn() }; });
vi.mock('@/modules/auth', () => ({ useStaffSession: mocks.session }));
const member = (propertyId: string, propertyCode: string, active = true) => ({ propertyId, propertyCode, active,
  name: propertyCode === 'HB-GT-DEMO' ? 'Hotel Boutique Demo' : 'Otro hotel', timezone: 'America/Guatemala', currency: 'GTQ' });
const initial: StaffSession = { id: 'staff-session', userName: 'Staff', roleId: 'GERENCIA', roleName: 'Gerencia',
  permissions: ['MULTI_PROPERTY_READ'], memberships: [member('other', 'OTHER'), member('demo', 'HB-GT-DEMO')] };
const key = 'pms:private-09:scope:staff-session';
function Scope() {
  const context = usePropertyScope();
  return <><PropertySwitcher /><output data-testid="scope">{JSON.stringify({ ready: context.ready, selection: context.selection, scope: context.scope })}</output>
    <button onClick={() => context.select('unauthorized')}>Intentar fuera de scope</button></>;
}
const app = () => <PropertyProvider><Scope /></PropertyProvider>;
beforeEach(() => { sessionStorage.clear(); mocks.session.mockReturnValue(structuredClone(initial)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function selected(id: string) {
  await waitFor(() => expect(screen.getByLabelText('Propiedad')).toHaveValue(id));
  await waitFor(() => expect(screen.getByTestId('scope')).toHaveTextContent('"ready":true'));
}
describe('Staff initial preference and live scope', () => {
  it.each(['other', 'unauthorized', 'ALL_PROPERTIES'])('reload uses Demo instead of stored %s, then allows manual changes', async stored => {
    sessionStorage.setItem(key, stored);
    const view = render(app()); await selected('demo');
    expect(sessionStorage.getItem(key)).toBe('demo');
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'other' } });
    await selected('other'); expect(sessionStorage.getItem(key)).toBe('other');
    view.unmount(); render(app()); await selected('demo'); expect(sessionStorage.getItem(key)).toBe('demo');
  });
  it('uses first active membership when Demo is absent or inactive', async () => {
    mocks.session.mockReturnValue({ ...initial, memberships: [member('inactive', 'HB-GT-DEMO', false), member('first', 'FIRST'), member('second', 'SECOND')] });
    render(app()); await selected('first');
    expect(screen.queryByRole('option', { name: /inactive/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Hotel Boutique Demo/ })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(key)).toBe('first');
  });
  it('refuses unauthorized manual selection without writing storage', async () => {
    render(app()); await selected('demo');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(screen.getByRole('button', { name: 'Intentar fuera de scope' }));
    expect(screen.getByTestId('scope')).toHaveTextContent('"propertyIds":["demo"]');
    expect(sessionStorage.getItem(key)).toBe('demo'); expect(write).not.toHaveBeenCalled();
  });
  it('allows authorized ALL_PROPERTIES manually and falls back when its permission is revoked', async () => {
    const view = render(app()); await selected('demo');
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'ALL_PROPERTIES' } });
    await selected('ALL_PROPERTIES');
    expect(screen.getByTestId('scope')).toHaveTextContent('"propertyIds":["demo","other"]');
    mocks.session.mockReturnValue({ ...initial, permissions: [] }); view.rerender(app());
    await selected('demo');
    await waitFor(() => expect(sessionStorage.getItem(key)).toBe('demo'));
    expect(screen.queryByRole('option', { name: 'Todas mis propiedades autorizadas' })).not.toBeInTheDocument();
  });
  it('preserves manual choice on session refresh and replaces it when membership is revoked', async () => {
    const view = render(app()); await selected('demo');
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'other' } }); await selected('other');
    mocks.session.mockReturnValue({ ...structuredClone(initial), userName: 'Refreshed Staff' }); view.rerender(app()); await selected('other');
    mocks.session.mockReturnValue({ ...initial, memberships: [member('other', 'OTHER', false), member('demo', 'HB-GT-DEMO')] });
    view.rerender(app()); await selected('demo');
    await waitFor(() => expect(sessionStorage.getItem(key)).toBe('demo'));
    expect(screen.getByTestId('scope')).not.toHaveTextContent('"propertyIds":["other"]');
  });
  it('resets to the new session authorized default, with no previous-session scope during initialization', async () => {
    const view = render(app()); await selected('demo');
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'other' } });
    mocks.session.mockReturnValue({ ...initial, id: 'new-session', memberships: [member('new-authorized', 'NEW')] });
    view.rerender(app());
    await selected('new-authorized');
    expect(screen.getByTestId('scope')).not.toHaveTextContent('"propertyIds":["other"]');
    expect(sessionStorage.getItem('pms:private-09:scope:new-session')).toBe('new-authorized');
  });
  it('clears stale storage and never resolves scope when no active membership remains', async () => {
    sessionStorage.setItem(key, 'unauthorized');
    mocks.session.mockReturnValue({ ...initial, memberships: [member('demo', 'HB-GT-DEMO', false)] });
    render(app()); await selected('');
    expect(screen.getByLabelText('Propiedad')).toBeDisabled();
    expect(screen.getByTestId('scope')).toHaveTextContent('"scope":null');
    expect(sessionStorage.getItem(key)).toBeNull();
  });
  it('keeps selection usable when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked storage'); });
    render(app()); await selected('demo');
    await act(async () => { fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'other' } }); });
    await selected('other'); expect(screen.getByTestId('scope')).toHaveTextContent('"propertyIds":["other"]');
  });
});

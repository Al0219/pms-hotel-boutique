import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import type { StaffSession } from '@/modules/auth';
import { StaffOnboardingActions } from './components/staff-onboarding-actions';
import { StaffInvitationPage } from './components/staff-invitation-page';
import type { StaffAdminUser } from './model/staff-admin';
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('@/modules/auth', () => ({ useRevalidateStaffSession: () => revalidate }));
const org = '11111111-1111-4111-8111-111111111111', id = '44444444-4444-4444-8444-444444444444', property = '22222222-2222-4222-8222-222222222222';
const actor = { id: 'session1', staffUserId: 'admin', roleId: 'GERENCIA', permissions: ['STAFF_MANAGE'], memberships: [{ propertyId: property, active: true, name: 'Hotel' }] } as StaffSession;
const user = { id, organizationId: org, username: 'nuevo', workEmail: 'nuevo@qa.test', status: 'SUSPENDED', membershipStatus: 'ACTIVE', roleCode: 'RECEPCION', version: 0, propertyIds: [property], createdAt: '2026-10-24T00:00:00Z', updatedAt: '2026-10-24T00:00:00Z' } as StaffAdminUser;
let info = { organizationId: org, staffUserId: id, version: 0, invitationAllowed: true, activationAllowed: false, credentialPrepared: false };
const clients: QueryClient[] = [];
const reads = vi.fn(), changed = vi.fn();
function mount(account = user, session = actor) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><StaffOnboardingActions user={account} session={session} scope={{ kind: 'PROPERTY', propertyIds: [property] }} disabled={false} onChanged={changed} /></QueryClientProvider>);
}
beforeEach(() => {
  info = { organizationId: org, staffUserId: id, version: 0, invitationAllowed: true, activationAllowed: false, credentialPrepared: false }; reads.mockClear(); changed.mockClear(); revalidate.mockClear();
  mockServer.use(http.get(`*/api/staff/admin/users/${id}/invitation`, ({ request }) => { reads(request); return HttpResponse.json(info); }));
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); window.history.replaceState(null, '', '/'); });
async function open() { await userEvent.click(screen.getByRole('button', { name: 'Invitación y activación de nuevo' })); await screen.findByRole('button', { name: 'Enviar invitación de recuperación' }); }
it('reads eligibility on demand, portals out of the row and sends only once', async () => {
  const post = vi.fn(async ({ request }: { request: Request }) => {
    expect(await request.json()).toEqual({ expectedVersion: 0 });
    info = { ...info, version: 1, invitationAllowed: false };
    return HttpResponse.json({ organizationId: org, staffUserId: id, version: 1, changed: true });
  });
  mockServer.use(http.post(`*/api/staff/admin/users/${id}/invitation`, post)); mount(); expect(reads).not.toHaveBeenCalled();
  const trigger = screen.getByRole('button', { name: 'Invitación y activación de nuevo' }); trigger.focus(); await userEvent.keyboard('{Enter}');
  const send = await screen.findByRole('button', { name: 'Enviar invitación de recuperación' }); expect(screen.getByRole('dialog').closest('[data-staff-row-action]')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument(); await userEvent.dblClick(send);
  await screen.findByText('Invitación de recuperación enviada'); expect(post).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar' })); expect(trigger).toHaveFocus();
});
it('shows reactivation only from backend eligibility and requires explicit confirmation', async () => {
  info = { ...info, version: 2, invitationAllowed: false, credentialPrepared: true, activationAllowed: true };
  const patch = vi.fn(async ({ request }: { request: Request }) => {
    expect(await request.json()).toEqual({ status: 'ACTIVE', expectedVersion: 2 }); info = { ...info, version: 3, activationAllowed: false };
    return HttpResponse.json({ organizationId: org, staffUserId: id, version: 3, changed: true });
  });
  mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`, patch)); mount();
  await userEvent.click(screen.getByRole('button', { name: 'Invitación y activación de nuevo' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Reactivar' }));
  expect(screen.getAllByRole('dialog')).toHaveLength(1); expect(patch).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Volver' })); expect(patch).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Reactivar' })); await userEvent.click(screen.getByRole('button', { name: 'Reactivar' }));
  await screen.findByText('Usuario reactivado'); expect(patch).toHaveBeenCalledOnce();
});
it.each([409, 503])('blocks another write after %i until explicit authorized GET', async status => {
  const post = vi.fn(() => HttpResponse.json({ code: status === 409 ? 'STAFF_VERSION_CONFLICT' : 'STAFF_WRITE_UNAVAILABLE' }, { status }));
  mockServer.use(http.post(`*/api/staff/admin/users/${id}/invitation`, post)); mount(); await open();
  await userEvent.click(screen.getByRole('button', { name: 'Enviar invitación de recuperación' }));
  await screen.findByRole('alert'); expect(screen.queryByRole('button', { name: 'Enviar invitación de recuperación' })).not.toBeInTheDocument(); expect(post).toHaveBeenCalledOnce();
  const before = reads.mock.calls.length; info = { ...info, version: 1, invitationAllowed: false };
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar usuario' })); await waitFor(() => expect(reads.mock.calls.length).toBeGreaterThan(before));
  expect(post).toHaveBeenCalledOnce();
});
it.each([{ ...user, status: 'DISABLED' as const }, { ...user, status: 'ACTIVE' as const }, { ...user, id: 'admin' }, { ...user, roleCode: 'SUPER_ADMIN' as const }])('hides initial access for protected/ineligible target', account => {
  mount(account); expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(reads).not.toHaveBeenCalled();
});
it('keeps old suspended accounts ineligible when backend says no', async () => {
  info = { ...info, invitationAllowed: false }; mount(); await userEvent.click(screen.getByRole('button', { name: 'Invitación y activación de nuevo' }));
  await screen.findByText(/No hay una invitación disponible/); expect(screen.queryByRole('button', { name: 'Enviar invitación de recuperación' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument();
});
it('does not mount actions without effective STAFF_MANAGE', () => {
  mount(user, { ...actor, permissions: [] }); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('recipient enters password once; fragment is scrubbed and consumption creates no UI session', async () => {
  const token = 'x'.repeat(43); window.history.replaceState(null, '', `/activar-staff#token=${token}`);
  const post = vi.fn(async ({ request }: { request: Request }) => {
    expect(await request.json()).toEqual({ token, password: 'New-password1!' }); return HttpResponse.json({ credentialPrepared: true });
  });
  mockServer.use(http.post('*/api/auth/staff/invitations/consume', post)); render(<StrictMode><StaffInvitationPage /></StrictMode>);
  expect(window.location.hash).toBe(''); expect(document.body.textContent).not.toContain(token); expect(post).not.toHaveBeenCalled();
  const password = await screen.findByLabelText('Nueva contraseña'); await userEvent.type(password, 'New-password1!');
  await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'different'); await userEvent.click(screen.getByRole('button', { name: 'Establecer contraseña' }));
  await screen.findByText('Las contraseñas no coinciden.'); expect(post).not.toHaveBeenCalled();
  await userEvent.clear(screen.getByLabelText('Confirmar contraseña')); await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'New-password1!');
  await userEvent.dblClick(screen.getByRole('button', { name: 'Establecer contraseña' })); await screen.findByText('Cuenta activada correctamente. Ya puedes iniciar sesión');
  expect(post).toHaveBeenCalledOnce(); expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/acceso?from=staff-activation');
  expect(screen.queryByText(/Tu administrador debe activar/)).not.toBeInTheDocument();
});
it.each([409, 503])('recipient failure %i never automatically replays password submission', async status => {
  window.history.replaceState(null, '', `/activar-staff#token=${'x'.repeat(43)}`);
  const post = vi.fn(() => HttpResponse.json({ code: status === 409 ? 'STAFF_INVITATION_INVALID' : 'STAFF_WRITE_UNAVAILABLE' }, { status }));
  mockServer.use(http.post('*/api/auth/staff/invitations/consume', post)); render(<StaffInvitationPage />);
  await userEvent.type(await screen.findByLabelText('Nueva contraseña'), 'New-password1!'); await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'New-password1!');
  await userEvent.click(screen.getByRole('button', { name: 'Establecer contraseña' })); await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Establecer contraseña' })).not.toBeInTheDocument(); expect(post).toHaveBeenCalledOnce();
});

it.each(['DISABLED', 'ACTIVE'] as const)('hides recovery and reactivation for %s', status => {
  mount({ ...user, status }); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('hides recovery for own account and SUPER_ADMIN targets', () => {
  const view = mount({ ...user, id: actor.staffUserId! }); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  view.unmount(); mount({ ...user, roleCode: 'SUPER_ADMIN' }); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

import { expect, it, vi } from 'vitest';
const redirect = vi.hoisted(() => vi.fn(() => { throw new Error('NEXT_REDIRECT'); }));
vi.mock('next/navigation', () => ({ redirect }));
import LegacyDetail from './[staffUserId]/page';
it.each(['44444444-4444-4444-8444-444444444444', 'external-or-inaccessible'])('redirects legacy target %s to guarded list without selecting or querying it', async staffUserId => {
  redirect.mockClear();
  await expect(LegacyDetail({ params: Promise.resolve({ staffUserId }), searchParams: Promise.resolve({ username: 'literal%_', status: 'SUSPENDED', organizationId: 'client-authority', cursor: 'opaque', returnTo: 'https://external.test' }) })).rejects.toThrow('NEXT_REDIRECT');
  expect(redirect).toHaveBeenCalledExactlyOnceWith('/seguridad/usuarios?username=literal%25_&status=SUSPENDED');
});

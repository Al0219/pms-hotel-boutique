import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { accountProfileFixture } from '@/data/mocks/account/accountProfileFixture';
import { NetworkError } from '@/data/remote/http/HttpError';
import { mapAccountProfileFixtureDto } from '@/modules/account/profile/data/mappers/mapAccountProfileFixtureDto';
import { MockAccountProfileService } from '@/modules/account/profile/data/mocks/MockAccountProfileService';
import { type AccountProfileService } from '@/modules/account/profile/data/services/AccountProfileService';
import { accountProfileQueryKey, useAccountProfile, useUpdateAccountProfile } from '@/modules/account/profile/presentation/hooks/useAccountProfile';

function client() { return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { gcTime: 0, retry: false } } }); }
function deferred<T>() { let resolve: (value: T) => void = () => undefined; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
const updateInput = { profile: { languageText: 'Español', bedPreferenceText: 'King', roomPreferenceText: 'Jardín', floorPreferenceText: 'Alto', avoidPreferenceText: 'Zonas ruidosas' }, marketingSmsConsent: 'revoked' as const };
function Harness({ service }: { service: AccountProfileService }) {
  const query = useAccountProfile(service);
  const mutation = useUpdateAccountProfile(service);
  return <View><Text testID="query-state">{query.isPending ? 'loading' : query.isError ? query.error instanceof NetworkError ? 'offline' : 'error' : query.data?.profile.roomPreferenceText ?? ''}</Text><Text testID="mutation-state">{mutation.isPending ? 'pending' : mutation.isSuccess ? 'success' : mutation.isError ? mutation.error instanceof NetworkError ? 'offline' : 'error' : 'idle'}</Text><Pressable onPress={() => mutation.mutate(updateInput)} testID="update"><Text>Actualizar</Text></Pressable></View>;
}
async function renderHarness(service: AccountProfileService, queryClient = client()) { return { queryClient, ...(await render(<QueryClientProvider client={queryClient}><Harness service={service} /></QueryClientProvider>)) }; }

describe('Account/Profile contracts', () => {
  it('maps distinct account identity and profile preferences without foreign domain fields', () => {
    const data = mapAccountProfileFixtureDto(accountProfileFixture);
    expect(data.account).toEqual({ key: 'guest-account-primary', displayName: 'Sofía Morales', emailText: 'sofia.morales@correo.example', phoneText: '+502 5555 0184', privacyText: 'Solo cuenta', marketingSmsConsent: 'consented' });
    expect(data.profile).toEqual(accountProfileFixture.profile);
    expect(data.account).not.toHaveProperty('reservationId');
    expect(data.profile).not.toHaveProperty('rewards');
    expect(data.profile).not.toHaveProperty('checkout');
  });

  it('reads fixture data and retains no Backend identity semantics', async () => {
    const service = new MockAccountProfileService();
    await expect(service.getAccountProfile()).resolves.toEqual(accountProfileFixture);
    const ui = await renderHarness(service);
    await waitFor(() => expect(ui.getByTestId('query-state').props.children).toBe('Tranquila'));
  });

  it.each([new Error('unavailable'), new NetworkError('offline')])('exposes read failures to TanStack Query', async (failure) => {
    const ui = await renderHarness(new MockAccountProfileService({ getAccountProfile: async () => { throw failure; } }));
    await waitFor(() => expect(ui.getByTestId('query-state').props.children).toBe(failure instanceof NetworkError ? 'offline' : 'error'));
  });

  it('updates only profile preferences and Marketing SMS in memory, then synchronizes query cache', async () => {
    const service = new MockAccountProfileService();
    const ui = await renderHarness(service);
    await waitFor(() => expect(ui.getByTestId('query-state').props.children).toBe('Tranquila'));
    await act(async () => { fireEvent.press(ui.getByTestId('update')); });
    await waitFor(() => expect(ui.getByTestId('mutation-state').props.children).toBe('success'));
    expect(ui.queryClient.getQueryData(accountProfileQueryKey)).toMatchObject({ profile: { roomPreferenceText: 'Jardín' }, account: { displayName: 'Sofía Morales', emailText: 'sofia.morales@correo.example', phoneText: '+502 5555 0184', marketingSmsConsent: 'revoked' } });
    await expect(service.getAccountProfile()).resolves.toMatchObject({ profile: { roomPreferenceText: 'Jardín' }, account: { marketingSmsConsent: 'REVOKED' } });
  });

  it('exposes pending before a successful mutation resolves', async () => {
    const pending = deferred<ReturnType<MockAccountProfileService['updateAccountProfile']> extends Promise<infer Result> ? Result : never>();
    const ui = await renderHarness(new MockAccountProfileService({ updateAccountProfile: () => pending.promise }));
    await waitFor(() => expect(ui.getByTestId('query-state').props.children).toBe('Tranquila'));
    await act(async () => { fireEvent.press(ui.getByTestId('update')); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(ui.getByTestId('mutation-state').props.children).toBe('pending');
    await act(async () => { pending.resolve({ ...accountProfileFixture, account: { ...accountProfileFixture.account, marketingSmsConsent: 'REVOKED' }, profile: updateInput.profile, confirmationText: 'Marketing SMS revocado · otras finalidades/canales sin cambios', auditText: 'Audit CONSENT_REVOKED · Android Perfil · Marketing/SMS' }); });
    await waitFor(() => expect(ui.getByTestId('mutation-state').props.children).toBe('success'));
  });

  it.each([new Error('failure'), new NetworkError('offline')])('preserves cached data when the mutation fails', async (error) => {
    const ui = await renderHarness(new MockAccountProfileService({ updateAccountProfile: async () => { throw error; } }));
    await waitFor(() => expect(ui.getByTestId('query-state').props.children).toBe('Tranquila'));
    await act(async () => { fireEvent.press(ui.getByTestId('update')); });
    await waitFor(() => expect(ui.getByTestId('mutation-state').props.children).toBe(error instanceof NetworkError ? 'offline' : 'error'));
    expect(ui.getByTestId('query-state').props.children).toBe('Tranquila');
  });
});

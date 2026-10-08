import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { accountProfileFixture } from '@/data/mocks/account/accountProfileFixture';
import { MockAccountProfileService } from '@/modules/account/profile/data/mocks/MockAccountProfileService';
import { type AccountProfileService } from '@/modules/account/profile/data/services/AccountProfileService';
import { ProfileScreen } from '@/modules/account/profile/presentation/ProfileScreen';

type UpdateResult = Awaited<ReturnType<AccountProfileService['updateAccountProfile']>>;

function createQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
}

async function renderProfile(service: AccountProfileService) {
  return render(<QueryClientProvider client={createQueryClient()}><ProfileScreen service={service} /></QueryClientProvider>);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function changeRoom(ui: Awaited<ReturnType<typeof renderProfile>>, value = 'Jardín') {
  await fireEvent.changeText(ui.getByTestId('profile-input-roomPreferenceText'), value);
  await waitFor(() => expect(ui.getByTestId('profile-save').props.accessibilityState.disabled).toBe(false));
}

describe('Profile', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows loading while the profile query is pending without rendering profile data', async () => {
    const pending = deferred<Awaited<ReturnType<AccountProfileService['getAccountProfile']>>>();
    const ui = await renderProfile(new MockAccountProfileService({ getAccountProfile: jest.fn(() => pending.promise) }));

    await waitFor(() => expect(ui.getByTestId('profile-loading')).toBeTruthy());
    expect(ui.queryByTestId('profile-identity')).toBeNull();
    expect(ui.queryByTestId('profile-preferences')).toBeNull();

    await act(async () => { pending.resolve(accountProfileFixture); });
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());
  });

  it('shows read-only identity and enables save only when an editable preference differs', async () => {
    const ui = await renderProfile(new MockAccountProfileService());
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());

    expect(ui.getByText('Sofía Morales')).toBeTruthy();
    expect(ui.getByText('sofia.morales@correo.example')).toBeTruthy();
    expect(ui.getByText('+502 5555 0184')).toBeTruthy();
    expect(ui.queryByTestId('profile-input-displayName')).toBeNull();
    expect(ui.getByTestId('profile-save').props.accessibilityState.disabled).toBe(true);

    await changeRoom(ui);
    await fireEvent.changeText(ui.getByTestId('profile-input-roomPreferenceText'), 'Tranquila');
    await waitFor(() => expect(ui.getByTestId('profile-save').props.accessibilityState.disabled).toBe(true));
  });

  it('marks the form dirty when Marketing SMS changes and submits the selected consent', async () => {
    const updateAccountProfile = jest.fn().mockResolvedValue({
      ...accountProfileFixture,
      account: { ...accountProfileFixture.account, marketingSmsConsent: 'REVOKED' },
      confirmationText: 'Cambios guardados',
      auditText: 'Audit',
    });
    const ui = await renderProfile(new MockAccountProfileService({ updateAccountProfile }));
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());

    expect(ui.getByTestId('profile-marketing-sms').props.value).toBe(true);
    fireEvent(ui.getByTestId('profile-marketing-sms'), 'valueChange', false);
    await waitFor(() => expect(ui.getByTestId('profile-marketing-sms').props.value).toBe(false));
    expect(ui.getByTestId('profile-save').props.accessibilityState.disabled).toBe(false);

    await act(async () => { fireEvent.press(ui.getByTestId('profile-save')); });
    await waitFor(() => expect(ui.getByTestId('profile-success')).toBeTruthy());
    expect(updateAccountProfile).toHaveBeenCalledWith(expect.objectContaining({ marketingSmsConsent: 'REVOKED' }));
  });

  it.each([
    ['generic', new Error('failure'), 'profile-error'],
    ['offline', new NetworkError('offline'), 'profile-offline'],
  ] as const)('renders %s read failures and retries', async (_name, error, expectedTestId) => {
    const getAccountProfile = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(accountProfileFixture);
    const ui = await renderProfile(new MockAccountProfileService({ getAccountProfile }));

    await waitFor(() => expect(ui.getByTestId(expectedTestId)).toBeTruthy());
    await fireEvent.press(ui.getByTestId('profile-retry'));
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());
    expect(getAccountProfile).toHaveBeenCalledTimes(2);
  });

  it('shows pending, prevents double submission, and confirms only after the mutation resolves', async () => {
    const pending = deferred<UpdateResult>();
    const updateAccountProfile = jest.fn(() => pending.promise);
    const ui = await renderProfile(new MockAccountProfileService({ updateAccountProfile }));
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());

    await changeRoom(ui);
    await fireEvent.press(ui.getByTestId('profile-save'));
    await fireEvent.press(ui.getByTestId('profile-save'));
    await waitFor(() => expect(ui.getByTestId('profile-save').props.accessibilityState.busy).toBe(true));
    expect(updateAccountProfile).toHaveBeenCalledTimes(1);
    expect(ui.queryByTestId('profile-success')).toBeNull();

    await act(async () => {
      pending.resolve({
        ...accountProfileFixture,
        profile: { ...accountProfileFixture.profile, roomPreferenceText: 'Jardín' },
        confirmationText: 'Cambios guardados',
        auditText: 'Audit',
      });
    });
    await waitFor(() => expect(ui.getByTestId('profile-success')).toBeTruthy());
    expect(ui.getByTestId('profile-input-roomPreferenceText').props.value).toBe('Jardín');
    expect(ui.getByTestId('profile-save').props.accessibilityState.disabled).toBe(true);
  });

  it.each([
    ['generic', new Error('failure'), 'profile-error'],
    ['offline', new NetworkError('offline'), 'profile-offline'],
  ] as const)('keeps the edited draft on %s mutation failure and retries it', async (_name, error, expectedTestId) => {
    const updateAccountProfile = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        ...accountProfileFixture,
        profile: { ...accountProfileFixture.profile, roomPreferenceText: 'Jardín' },
        confirmationText: 'Cambios guardados',
        auditText: 'Audit',
      });
    const ui = await renderProfile(new MockAccountProfileService({ updateAccountProfile }));
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());

    await changeRoom(ui);
    await fireEvent.press(ui.getByTestId('profile-save'));
    await waitFor(() => expect(ui.getByTestId(expectedTestId)).toBeTruthy());
    expect(ui.getByTestId('profile-input-roomPreferenceText').props.value).toBe('Jardín');
    await fireEvent.press(ui.getByTestId('profile-retry'));
    await waitFor(() => expect(ui.getByTestId('profile-success')).toBeTruthy());
    expect(updateAccountProfile).toHaveBeenCalledTimes(2);
  });

  it('guards child-header and Android hardware Back while edits are unsaved', async () => {
    const dismissTo = jest.spyOn(router, 'dismissTo').mockImplementation(() => undefined as never);
    let triggerHardwareBack: (() => boolean) | undefined;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      triggerHardwareBack = () => handler({} as never) === true;
      return { remove: jest.fn() } as never;
    });
    const ui = await renderProfile(new MockAccountProfileService());
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());

    await fireEvent.changeText(ui.getByTestId('profile-input-languageText'), 'English');
    await waitFor(() => expect(ui.getByTestId('profile-save').props.accessibilityState.disabled).toBe(false));
    await fireEvent.press(ui.getByTestId('profile-back'));
    await waitFor(() => expect(ui.getByTestId('profile-unsaved-dialog')).toBeTruthy());
    expect(ui.getByTestId('profile-screen')).toBeTruthy();
    expect(ui.getByTestId('profile-identity')).toBeTruthy();
    expect(ui.getByTestId('profile-input-languageText').props.value).toBe('English');
    await fireEvent.press(ui.getByTestId('profile-continue-editing'));
    expect(ui.queryByTestId('profile-unsaved-dialog')).toBeNull();
    expect(ui.getByTestId('profile-input-languageText').props.value).toBe('English');

    await act(async () => { expect(triggerHardwareBack?.()).toBe(true); });
    await waitFor(() => expect(ui.getByTestId('profile-discard')).toBeTruthy());
    await fireEvent.press(ui.getByTestId('profile-discard'));
    expect(dismissTo).toHaveBeenCalledWith('/account');
  });

  it('returns directly to Account when the form is not dirty', async () => {
    const dismissTo = jest.spyOn(router, 'dismissTo').mockImplementation(() => undefined as never);
    const ui = await renderProfile(new MockAccountProfileService());
    await waitFor(() => expect(ui.getByTestId('profile-identity')).toBeTruthy());

    fireEvent.press(ui.getByTestId('profile-back'));
    expect(dismissTo).toHaveBeenCalledWith('/account');
    expect(ui.queryByTestId('profile-continue-editing')).toBeNull();
  });
});

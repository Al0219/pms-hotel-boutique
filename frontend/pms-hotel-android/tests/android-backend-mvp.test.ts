import { FetchTransport } from '@/data/remote/http/FetchTransport';
import { HttpError, NetworkError } from '@/data/remote/http/HttpError';
import { NativeGuestClient, GuestSessionExpiredError, type RefreshStore } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { HttpGuestAccountService, HttpGuestAuthService, HttpLinkedReservationsService } from '@/modules/guest-auth/data/http/HttpGuestServices';
import { HttpStayService } from '@/modules/stay/data/http/HttpStayService';
import { InvalidGuestCredentialsError } from '@/modules/guest-auth/domain/errors/InvalidGuestCredentialsError';
import { mapReservationStayDto } from '@/modules/stay/data/mappers/mapReservationStayDto';

const origin = 'https://pms.example.test';
const tokens = { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', accessTokenExpiresInSeconds: 900 };
const session = { guestAccountId: 'own-account', context: 'GUEST' };
const saved = () => JSON.stringify({ backend: origin, refreshToken: tokens.refreshToken });
function fixture(initial: string | null = null, transport?: FetchTransport) {
  let value = initial;
  const request = jest.fn();
  const store: RefreshStore = {
    read: jest.fn(async () => value),
    write: jest.fn(async (next: string) => { value = next; }),
    clear: jest.fn(async () => { value = null; }),
  };
  return { request, store, client: new NativeGuestClient(transport ?? { request }, store, () => origin) };
}
afterEach(() => jest.restoreAllMocks());

it('login -> summary -> linked stays -> selected stay uses FetchTransport, omits cookies and never persists passwords', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  const responses = [tokens, session,
    { guestAccountId: 'own-account', email: 'synthetic@example.test', active: true }, null,
    [{ reservationId: 'r', stayId: 's', confirmationCode: 'REAL-REFERENCE', propertyName: 'Persisted Hotel', arrival: '2026-10-25', departure: '2026-10-28', roomCode: '204', status: 'IN_HOUSE' }],
    { id: 's', reservationId: 'r', confirmationCode: 'REAL-REFERENCE', roomType: { id: 'type', name: 'Persisted type' }, room: { id: 'room', code: '204' }, arrival: '2026-10-25', departure: '2026-10-28', status: 'IN_HOUSE' }];
  for (const body of responses) fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body } as Response);
  const { client, store } = fixture(null, new FetchTransport());
  const account = await new HttpGuestAuthService(client).login({ email: 'synthetic@example.test', password: 'synthetic-password' });
  expect(account).toEqual({ accountId: 'own-account' });
  expect(await new HttpGuestAccountService(client).getCurrent(account)).toMatchObject({ key: 'own-account', emailText: 'synthetic@example.test' });
  const linked = await new HttpLinkedReservationsService(client).listForAccount('untrusted-account');
  expect(linked[0].reference).toBe('REAL-REFERENCE');
  const stay = mapReservationStayDto(await new HttpStayService(client).getCurrentStay({ reservationId: linked[0].reservationId, reservationStayId: linked[0].reservationStayId }));
  expect(stay.confirmationCode).toBe('REAL-REFERENCE');
  expect(stay.reservationId).toBe('r');
  expect(stay.room).toEqual({ id: 'room', number: '204' }); expect(stay.roomType.name).toBe('Persisted type');
  expect(store.write).toHaveBeenCalledWith(saved()); expect(JSON.stringify((store.write as jest.Mock).mock.calls)).not.toContain('password');
  for (const [url, init] of fetchMock.mock.calls) {
    expect(String(url)).not.toContain('untrusted-account'); expect(init).toMatchObject({ credentials: 'omit', redirect: 'error' });
    expect(init?.headers).not.toHaveProperty('Cookie');
  }
});

it('cold start restores from SecureStore refresh, rotates it, and reads the live identity', async () => {
  const { request, client, store } = fixture(saved());
  request.mockResolvedValueOnce({ ...tokens, refreshToken: 'rotated' }).mockResolvedValueOnce(session);
  expect(await client.restore()).toEqual({ accountId: 'own-account' });
  expect(request.mock.calls[0][1].headers).toMatchObject({ 'X-Guest-Refresh-Token': tokens.refreshToken });
  expect(request.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  expect(store.write).toHaveBeenCalledWith(JSON.stringify({ backend: origin, refreshToken: 'rotated' }));
});
it('cold start without credentials is signed out without HTTP', async () => {
  const { request, client } = fixture(); expect(await client.restore()).toBeNull(); expect(request).not.toHaveBeenCalled();
});
it('deduplicates concurrent refreshes', async () => {
  const { request, client } = fixture(saved()); request.mockResolvedValue(tokens);
  await Promise.all([client.refresh(), client.refresh(), client.refresh()]); expect(request).toHaveBeenCalledTimes(1);
});
it('two simultaneous 401s rotate once and retry with the new access token', async () => {
  const { request, client } = fixture(saved()); request.mockResolvedValueOnce(tokens); await client.refresh(); request.mockReset();
  request.mockRejectedValueOnce(new HttpError('Expired', 401)).mockRejectedValueOnce(new HttpError('Expired', 401))
    .mockResolvedValueOnce({ ...tokens, accessToken: 'rotated-access' }).mockResolvedValue({ ok: true });
  await Promise.all([client.request('/one'), client.request('/two')]);
  expect(request.mock.calls.filter(([url]) => url.endsWith('/refresh'))).toHaveLength(1);
  expect(request.mock.calls.slice(-2).map(([, init]) => init.headers.Authorization)).toEqual(['Bearer rotated-access', 'Bearer rotated-access']);
});
it('a second 401 expires the session, clears storage and notifies the provider', async () => {
  const { request, client, store } = fixture(saved()); const expired = jest.fn(); client.onExpired(expired);
  request.mockResolvedValueOnce(tokens); await client.refresh();
  request.mockRejectedValueOnce(new HttpError('Expired', 401)).mockResolvedValueOnce(tokens).mockRejectedValueOnce(new HttpError('Expired', 401));
  await expect(client.request('/own-data')).rejects.toBeInstanceOf(GuestSessionExpiredError);
  expect(store.clear).toHaveBeenCalledTimes(1); expect(expired).toHaveBeenCalledTimes(1);
});
it.each([new NetworkError(), new HttpError('Unavailable', 503)])('preserves refresh on recoverable restore failure: %s', async (error) => {
  const { request, client, store } = fixture(saved()); request.mockRejectedValue(error);
  await expect(client.restore()).rejects.toBe(error); expect(store.clear).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledTimes(1);
});
it('invalid login neither creates a session nor persists credentials', async () => {
  const { request, client, store } = fixture(); request.mockRejectedValue(new HttpError('Unauthorized', 401));
  await expect(client.login({ email: 'synthetic@example.test', password: 'synthetic' })).rejects.toBeInstanceOf(InvalidGuestCredentialsError);
  expect(store.write).not.toHaveBeenCalled();
});
it('malformed token responses fail before storage', async () => {
  const { request, client, store } = fixture(); request.mockResolvedValue({ accessToken: 'incomplete' });
  await expect(client.login({ email: 'synthetic@example.test', password: 'synthetic' })).rejects.toThrow('Invalid Guest token response');
  expect(store.write).not.toHaveBeenCalled();
});
it.each(['{invalid', JSON.stringify({ backend: 'https://other.example.test', refreshToken: 'synthetic' })])('never sends corrupt or another-backend credentials: %s', async (credential) => {
  const { request, client, store } = fixture(credential); expect(await client.restore()).toBeNull(); expect(request).not.toHaveBeenCalled(); expect(store.clear).toHaveBeenCalled();
});
it('logout revokes on the server then clears SecureStore', async () => {
  const { request, client, store } = fixture(saved()); request.mockResolvedValueOnce(tokens).mockResolvedValueOnce(null);
  await client.logout(); expect(request.mock.calls[1][0]).toBe(origin + '/api/v1/guest-auth/logout'); expect(store.clear).toHaveBeenCalled();
});
it('failed offline logout preserves the credential', async () => {
  const { request, client, store } = fixture(saved()); request.mockResolvedValueOnce(tokens).mockRejectedValueOnce(new NetworkError());
  await expect(client.logout()).rejects.toBeInstanceOf(NetworkError); expect(store.clear).not.toHaveBeenCalled();
});
it('HTTP errors never fall back to mock reservations or stay data', async () => {
  const { request, client } = fixture(saved()); request.mockResolvedValueOnce(tokens); await client.refresh(); request.mockRejectedValue(new HttpError('Not found', 404));
  await expect(new HttpLinkedReservationsService(client).listForAccount('own')).rejects.toMatchObject({ status: 404 });
  await expect(new HttpStayService(client).getCurrentStay({ reservationId: 'r', reservationStayId: 's' })).rejects.toMatchObject({ status: 404 });
});
it('validates selected stay identity and preserves room=null', async () => {
  const { request, client } = fixture(saved()); request.mockResolvedValueOnce(tokens); await client.refresh();
  request.mockResolvedValue({ id: 's', reservationId: 'r', roomType: { id: 'type', name: 'Type' }, room: null, arrival: '2026-10-25', departure: '2026-10-26', status: 'RESERVED' });
  const service = new HttpStayService(client);
  expect(mapReservationStayDto(await service.getCurrentStay({ reservationId: 'r', reservationStayId: 's' })).room).toBeNull();
  await expect(service.getCurrentStay({ reservationId: 'other', reservationStayId: 's' })).rejects.toThrow();
});
it('FetchTransport supports empty 204 logout responses', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, status: 204 } as Response);
  expect(await new FetchTransport().request('https://example.test')).toBeNull();
});

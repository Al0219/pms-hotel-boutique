import { MockTransport } from '@/data/mocks/MockTransport';
import { FetchTransport } from '@/data/remote/http/FetchTransport';
import { NetworkError } from '@/data/remote/http/HttpError';

describe('technical transports', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns JSON through the fetch transport', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ value: 'technical' }),
      ok: true,
      status: 200,
    } as Response);

    await expect(new FetchTransport().request<{ value: string }>('https://transport.invalid'))
      .resolves.toEqual({ value: 'technical' });
  });

  it('normalizes failed HTTP responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(new FetchTransport().request('https://transport.invalid')).rejects.toMatchObject({
      name: 'HttpError',
      status: 503,
    });
  });

  it('simulates success, null, empty, error, and offline at the transport boundary', async () => {
    await expect(
      new MockTransport({ kind: 'success', body: { value: 'technical' } }).request('mock'),
    ).resolves.toEqual({ value: 'technical' });
    await expect(new MockTransport({ kind: 'success', body: null }).request('mock')).resolves.toBeNull();
    await expect(new MockTransport({ kind: 'success', body: [] }).request('mock')).resolves.toEqual([]);
    await expect(
      new MockTransport({ kind: 'error', message: 'simulated failure' }).request('mock'),
    ).rejects.toThrow('simulated failure');
    await expect(new MockTransport({ kind: 'offline' }).request('mock')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});

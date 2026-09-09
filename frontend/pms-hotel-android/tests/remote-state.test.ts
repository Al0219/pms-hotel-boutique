import { NetworkError } from '@/data/remote/http/HttpError';
import { deriveRemoteState } from '@/state/remoteState';

describe('deriveRemoteState', () => {
  it('derives loading, empty, and success without owning server state', () => {
    expect(
      deriveRemoteState<string[]>({ data: undefined, error: null, isError: false, isPending: true }, () => false)
        .kind,
    ).toBe('loading');
    expect(
      deriveRemoteState<string[]>({ data: [], error: null, isError: false, isPending: false }, (data) => data.length === 0)
        .kind,
    ).toBe('empty');
    expect(
      deriveRemoteState<string[]>({ data: ['ready'], error: null, isError: false, isPending: false }, () => false)
        .kind,
    ).toBe('success');
  });

  it('derives offline only from a simulated network error', () => {
    const state = deriveRemoteState<undefined>(
      { data: undefined, error: new NetworkError(), isError: true, isPending: false },
      () => false,
    );

    expect(state.kind).toBe('offline');
  });
});

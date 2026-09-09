import { NetworkError } from '@/data/remote/http/HttpError';

export type RemoteState<T> =
  | { kind: 'loading' }
  | { kind: 'success'; data: T }
  | { kind: 'empty' }
  | { kind: 'error'; error: Error }
  | { kind: 'offline'; error: NetworkError };

export interface QueryStateSnapshot<T> {
  data: T | undefined;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
}

export function deriveRemoteState<T>(
  query: QueryStateSnapshot<T>,
  isEmpty: (data: T) => boolean,
): RemoteState<T> {
  if (query.isPending) {
    return { kind: 'loading' };
  }

  if (query.isError && query.error instanceof NetworkError) {
    return { kind: 'offline', error: query.error };
  }

  if (query.isError && query.error) {
    return { kind: 'error', error: query.error };
  }

  if (query.data !== undefined && isEmpty(query.data)) {
    return { kind: 'empty' };
  }

  return { kind: 'success', data: query.data as T };
}

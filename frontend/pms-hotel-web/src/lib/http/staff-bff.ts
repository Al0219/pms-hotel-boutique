import { httpRequest } from './client';
import { HttpStatusError } from './errors';
import type { HttpRequestOptions } from './types';

const bffUrl = (path: string) => new URL(path, window.location.origin).href;
let refreshInFlight: Promise<{ refreshed: boolean }> | undefined;

export function refreshStaffBffSession(): Promise<{ refreshed: boolean }> {
  return httpRequest({ path: bffUrl('/api/auth/staff/refresh'), method: 'POST', withAuth: false });
}

/** One Staff cookie rotation shared by session and data reads; independent from Guest. */
export function restoreStaffBffSession(): Promise<{ refreshed: boolean }> {
  refreshInFlight ??= refreshStaffBffSession().finally(() => { refreshInFlight = undefined; });
  return refreshInFlight;
}

export function staffBffRead<T>(path: string, signal?: AbortSignal): Promise<T> {
  return staffBffRequest<T>(path, { signal });
}

export async function staffBffRequest<T>(path: string, init: Omit<HttpRequestOptions, 'path' | 'withAuth'> = {}): Promise<T> {
  const { signal } = init;
  const options: HttpRequestOptions = { ...init, path: bffUrl(path), withAuth: false };
  try { return await httpRequest<T>(options); }
  catch (error) {
    if (signal?.aborted || !(error instanceof HttpStatusError) || error.status !== 401) throw error;
    await restoreStaffBffSession();
    if (signal?.aborted) throw error;
    return httpRequest<T>(options);
  }
}

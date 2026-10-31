import * as SecureStore from 'expo-secure-store';

import { environment, requireApiBaseUrl } from '@/config/environment';
import { FetchTransport } from '@/data/remote/http/FetchTransport';
import { type HttpClient, type JsonValue } from '@/data/remote/http/HttpClient';
import { HttpError } from '@/data/remote/http/HttpError';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { type GuestLoginRequest } from '@/modules/guest-auth/domain/models/GuestLoginRequest';
import { InvalidGuestCredentialsError } from '@/modules/guest-auth/domain/errors/InvalidGuestCredentialsError';

export interface RefreshStore {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
}
const storageKey = 'pms.guest.native.refresh.v1';
export const secureRefreshStore: RefreshStore = {
  read: () => SecureStore.getItemAsync(storageKey),
  write: (value) => SecureStore.setItemAsync(storageKey, value),
  clear: () => SecureStore.deleteItemAsync(storageKey),
};
interface TokenDto { accessToken: string; refreshToken: string; accessTokenExpiresInSeconds: number; }
interface SessionDto { guestAccountId: string; context: string; }

export class GuestSessionExpiredError extends HttpError {
  constructor() { super('Guest session expired', 401); }
}

/** Access token stays in memory. Only an origin-bound refresh credential enters SecureStore. */
export class NativeGuestClient {
  private accessToken: string | null = null;
  private renewal: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  constructor(
    private readonly transport: HttpClient = new FetchTransport(),
    private readonly store: RefreshStore = secureRefreshStore,
    private readonly baseUrl: () => string = requireApiBaseUrl,
  ) {}

  onExpired(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private async raw<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      return await this.transport.request<JsonValue>(this.baseUrl() + path, {
        ...init,
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...init.headers },
      }) as T;
    } finally { clearTimeout(timeout); }
  }

  private async saveTokens(dto: TokenDto): Promise<void> {
    if (!dto || typeof dto.accessToken !== 'string' || !dto.accessToken || typeof dto.refreshToken !== 'string' || !dto.refreshToken
      || !Number.isFinite(dto.accessTokenExpiresInSeconds) || dto.accessTokenExpiresInSeconds <= 0) {
      throw new Error('Invalid Guest token response');
    }
    // Persist the rotated refresh before making access available to concurrent requests.
    await this.store.write(JSON.stringify({ backend: this.baseUrl(), refreshToken: dto.refreshToken }));
    this.accessToken = dto.accessToken;
  }

  private async expire(): Promise<never> {
    this.accessToken = null;
    try { await this.store.clear(); }
    finally { this.listeners.forEach((listener) => listener()); }
    throw new GuestSessionExpiredError();
  }

  async refresh(): Promise<void> {
    if (this.renewal) return this.renewal;
    this.renewal = (async () => {
      const saved = await this.store.read();
      if (!saved) return this.expire();
      let credential: { backend?: string; refreshToken?: string };
      try { credential = JSON.parse(saved); } catch { return this.expire(); }
      if (!credential || credential.backend !== this.baseUrl() || typeof credential.refreshToken !== 'string' || !credential.refreshToken) return this.expire();
      try {
        const dto = await this.raw<TokenDto>('/api/v1/guest-auth/refresh', {
          method: 'POST', headers: { 'X-Guest-Refresh-Token': credential.refreshToken },
        });
        await this.saveTokens(dto);
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) return this.expire();
        // Offline/5xx keeps the refresh credential available for an explicit retry.
        throw error;
      }
    })();
    try { await this.renewal; } finally { this.renewal = null; }
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.accessToken) await this.refresh();
    const usedToken = this.accessToken;
    const send = () => this.raw<T>(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${this.accessToken}` } });
    try { return await send(); }
    catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) throw error;
      // A concurrent request may already have rotated this access credential.
      if (this.accessToken === usedToken) await this.refresh();
      try { return await send(); }
      catch (retryError) {
        if (retryError instanceof HttpError && retryError.status === 401) return this.expire();
        throw retryError;
      }
    }
  }

  private async session(): Promise<GuestAuthSession> {
    const dto = await this.request<SessionDto>('/api/v1/guest-auth/me');
    if (!dto || dto.context !== 'GUEST' || typeof dto.guestAccountId !== 'string' || !dto.guestAccountId) throw new Error('Invalid Guest session response');
    return { accountId: dto.guestAccountId };
  }

  async login(request: GuestLoginRequest): Promise<GuestAuthSession> {
    let dto: TokenDto;
    try {
      dto = await this.raw<TokenDto>('/api/v1/guest-auth/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) throw new InvalidGuestCredentialsError();
      throw error;
    }
    await this.saveTokens(dto);
    return this.session();
  }

  async loginWithTokens(dto: { accessToken: string; refreshToken?: string; accessTokenExpiresInSeconds?: number }): Promise<GuestAuthSession> {
    const expiresIn = dto.accessTokenExpiresInSeconds && Number.isFinite(dto.accessTokenExpiresInSeconds) && dto.accessTokenExpiresInSeconds > 0
      ? dto.accessTokenExpiresInSeconds
      : 900;
    if (dto.refreshToken) {
      await this.saveTokens({
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken,
        accessTokenExpiresInSeconds: expiresIn,
      });
    } else {
      this.accessToken = dto.accessToken;
    }
    return this.session();
  }

  async restore(): Promise<GuestAuthSession | null> {
    if (!(await this.store.read())) return null;
    try { await this.refresh(); return await this.session(); }
    catch (error) { if (error instanceof GuestSessionExpiredError) return null; throw error; }
  }

  async logout(): Promise<void> {
    try { await this.request<null>('/api/v1/guest-auth/logout', { method: 'POST' }); }
    catch (error) { if (!(error instanceof GuestSessionExpiredError)) throw error; }
    this.accessToken = null;
    await this.store.clear();
  }
}
export const nativeGuestClient = new NativeGuestClient();
export const isRealGuestApi = !environment.useMockApi;

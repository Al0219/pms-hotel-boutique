import { NetworkError } from '@/data/remote/http/HttpError';
import { type GuestAuthService } from '@/modules/guest-auth/data/services/GuestAuthService';
import { InvalidGuestCredentialsError } from '@/modules/guest-auth/domain/errors/InvalidGuestCredentialsError';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { type GuestLoginRequest } from '@/modules/guest-auth/domain/models/GuestLoginRequest';

type MockGuestAuthScenario =
  | { kind: 'success'; session?: GuestAuthSession }
  | { kind: 'invalid-credentials' }
  | { kind: 'error'; error?: Error }
  | { kind: 'offline'; error?: NetworkError };

export interface MockGuestAuthServiceOptions {
  scenario?: MockGuestAuthScenario;
  login?: (request: GuestLoginRequest) => Promise<GuestAuthSession>;
}

const defaultSession: GuestAuthSession = { accountId: 'guest-account-primary' };
const acceptedMockCredentials = { email: 'guest@example.com', password: 'guest-demo-password' };

/** Deterministic local mock boundary. It never creates or returns a token. */
export class MockGuestAuthService implements GuestAuthService {
  public constructor(private readonly options: MockGuestAuthServiceOptions = {}) {}

  public async login(request: GuestLoginRequest): Promise<GuestAuthSession> {
    if (this.options.login) return this.options.login(request);

    const scenario = this.options.scenario ?? { kind: 'success' as const };
    if (scenario.kind === 'invalid-credentials') throw new InvalidGuestCredentialsError();
    if (scenario.kind === 'offline') throw scenario.error ?? new NetworkError();
    if (scenario.kind === 'error') throw scenario.error ?? new Error('Guest auth mock failed');
    if (request.email.trim().toLocaleLowerCase() !== acceptedMockCredentials.email || request.password !== acceptedMockCredentials.password) {
      throw new InvalidGuestCredentialsError();
    }

    return { ...(scenario.session ?? defaultSession) };
  }
}

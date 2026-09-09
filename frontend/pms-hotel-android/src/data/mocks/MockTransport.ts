import { NetworkError } from '@/data/remote/http/HttpError';
import { type HttpClient, type JsonValue } from '@/data/remote/http/HttpClient';

export type MockTransportScenario<T extends JsonValue> =
  | { kind: 'success'; body: T }
  | { kind: 'error'; message: string }
  | { kind: 'offline' };

export class MockTransport<T extends JsonValue> implements HttpClient {
  public constructor(private readonly scenario: MockTransportScenario<T>) {}

  public async request<TResult extends JsonValue>(
    _input: RequestInfo | URL,
    _init?: RequestInit,
  ): Promise<TResult> {
    if (this.scenario.kind === 'offline') {
      throw new NetworkError();
    }

    if (this.scenario.kind === 'error') {
      throw new Error(this.scenario.message);
    }

    return this.scenario.body as unknown as TResult;
  }
}

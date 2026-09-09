import { HttpError, NetworkError } from '@/data/remote/http/HttpError';
import { type HttpClient, type JsonValue } from '@/data/remote/http/HttpClient';

export class FetchTransport implements HttpClient {
  public async request<T extends JsonValue>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(input, init);
    } catch {
      throw new NetworkError();
    }

    if (!response.ok) {
      throw new HttpError(`HTTP request failed with ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  }
}

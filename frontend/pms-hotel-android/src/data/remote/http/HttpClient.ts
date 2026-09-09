export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface HttpClient {
  request<T extends JsonValue>(input: RequestInfo | URL, init?: RequestInit): Promise<T>;
}

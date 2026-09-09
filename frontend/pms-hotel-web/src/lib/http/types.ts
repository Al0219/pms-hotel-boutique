export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestOptions {
  path: string;
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;
  baseUrl?: string;
}

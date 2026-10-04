export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestOptions {
  path?: string;
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string> | HeadersInit;
  body?: BodyInit | null;
  json?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  baseUrl?: string;
  withAuth?: boolean;
}

export type RequestInterceptor = (
  options: HttpRequestOptions
) => Promise<HttpRequestOptions> | HttpRequestOptions;

export type ResponseInterceptor = <T>(
  data: T,
  response: Response,
  options: HttpRequestOptions
) => Promise<T> | T;

export type ErrorInterceptor = (
  error: unknown,
  options: HttpRequestOptions
) => Promise<unknown> | unknown;

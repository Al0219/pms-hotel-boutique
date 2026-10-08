import { httpRequest } from "./client";

/** Private 07 approved mock transport only. Never uses the Backend base URL. */
export function mockRequest<T>(resource: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return httpRequest<T>({
    path: new URL(`/__mock/private-07/${resource}`, window.location.origin).href,
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
}


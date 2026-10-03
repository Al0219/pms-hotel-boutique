import type {
  HttpRequestOptions,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./types";

let currentAuthToken: string | null = null;
let unauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

export function onUnauthorized(callback: (() => void) | null): () => void {
  unauthorizedCallback = callback;
  return () => {
    if (unauthorizedCallback === callback) {
      unauthorizedCallback = null;
    }
  };
}

export function triggerUnauthorized(): void {
  if (unauthorizedCallback) {
    unauthorizedCallback();
  }
}

// Built-in Request Interceptor: Injects JWT and serializes JSON / query parameters
export const defaultAuthAndJsonRequestInterceptor: RequestInterceptor = (options) => {
  const headers = new Headers(options.headers || {});

  // 1. Inject Authorization header if token exists and withAuth is not explicitly false
  const withAuth = options.withAuth ?? true;
  if (withAuth && currentAuthToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${currentAuthToken}`);
  }

  // 2. Handle JSON payload serialization
  let body = options.body;
  if (options.json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(options.json);
  }

  // 3. Handle query parameters in path / url
  let path = options.path || options.url || "";
  if (options.params && Object.keys(options.params).length > 0) {
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        urlParams.set(key, String(value));
      }
    }
    const queryString = urlParams.toString();
    if (queryString) {
      const separator = path.includes("?") ? "&" : "?";
      path = `${path}${separator}${queryString}`;
    }
  }

  return {
    ...options,
    path,
    url: path,
    headers,
    body,
  };
};

// Global interceptors registry
export const requestInterceptors: RequestInterceptor[] = [
  defaultAuthAndJsonRequestInterceptor,
];

export const responseInterceptors: ResponseInterceptor[] = [];

export const errorInterceptors: ErrorInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  requestInterceptors.push(interceptor);
  return () => {
    const index = requestInterceptors.indexOf(interceptor);
    if (index !== -1) requestInterceptors.splice(index, 1);
  };
}

export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  responseInterceptors.push(interceptor);
  return () => {
    const index = responseInterceptors.indexOf(interceptor);
    if (index !== -1) responseInterceptors.splice(index, 1);
  };
}

export function addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
  errorInterceptors.push(interceptor);
  return () => {
    const index = errorInterceptors.indexOf(interceptor);
    if (index !== -1) errorInterceptors.splice(index, 1);
  };
}

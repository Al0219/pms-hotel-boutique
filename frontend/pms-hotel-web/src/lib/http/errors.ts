export class HttpStatusError extends Error {
  readonly status: number;
  readonly responseData?: unknown;

  constructor(status: number, statusText: string, responseData?: unknown) {
    super(`HTTP_${status}: ${statusText}`);
    this.name = "HttpStatusError";
    this.status = status;
    this.cause = statusText;
    this.responseData = responseData;
  }
}

export class HttpUnauthorizedError extends HttpStatusError {
  constructor(statusText = "Unauthorized", responseData?: unknown) {
    super(401, statusText, responseData);
    this.name = "HttpUnauthorizedError";
  }
}

export class HttpForbiddenError extends HttpStatusError {
  constructor(statusText = "Forbidden", responseData?: unknown) {
    super(403, statusText, responseData);
    this.name = "HttpForbiddenError";
  }
}

export class HttpNetworkError extends Error {
  constructor(message = "HTTP_NETWORK_ERROR") {
    super(message);
    this.name = "HttpNetworkError";
  }
}

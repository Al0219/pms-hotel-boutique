export class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number, statusText: string) {
    super(`HTTP_${status}`);
    this.name = "HttpStatusError";
    this.status = status;
    this.cause = statusText;
  }
}

export class HttpNetworkError extends Error {
  constructor() {
    super("HTTP_NETWORK_ERROR");
    this.name = "HttpNetworkError";
  }
}

export class HttpError extends Error {
  public readonly status: number | undefined;

  public constructor(message: string, status?: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class NetworkError extends HttpError {
  public constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

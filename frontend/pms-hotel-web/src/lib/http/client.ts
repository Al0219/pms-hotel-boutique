import { getPublicEnvironment } from "@/lib/env";

import { HttpNetworkError, HttpStatusError } from "./errors";
import type { HttpRequestOptions } from "./types";

function resolveUrl(path: string, baseUrl: string | undefined): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}

export async function httpRequest<ResponseDto>({
  path,
  method = "GET",
  headers,
  body,
  signal,
  baseUrl = getPublicEnvironment().apiBaseUrl,
}: HttpRequestOptions): Promise<ResponseDto> {
  let response: Response;

  try {
    response = await fetch(resolveUrl(path, baseUrl), {
      method,
      headers,
      body,
      signal,
    });
  } catch {
    throw new HttpNetworkError();
  }

  if (!response.ok) {
    throw new HttpStatusError(response.status, response.statusText);
  }

  return (await response.json()) as ResponseDto;
}

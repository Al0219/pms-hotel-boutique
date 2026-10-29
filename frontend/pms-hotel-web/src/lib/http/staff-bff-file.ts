import { HttpNetworkError, HttpStatusError } from "./errors";
import { restoreStaffBffSession } from "./staff-bff";

export interface StaffFileResponse {
  body: Blob;
  contentType: string | null;
  disposition: string | null;
}

/** Same-origin binary Staff read; one 401 refresh, no network/5xx retries or storage. */
export async function staffBffFile(path: string, signal?: AbortSignal): Promise<StaffFileResponse> {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("STAFF_FILE_ORIGIN_REQUIRED");
  const request = async () => {
    try {
      return await fetch(url.href, { method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { accept: "text/csv" } });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new HttpNetworkError();
    }
  };
  let response = await request();
  if (response.status === 401 && !signal?.aborted) {
    await restoreStaffBffSession();
    signal?.throwIfAborted();
    response = await request();
  }
  if (!response.ok) throw new HttpStatusError(response.status, "File unavailable");
  return { body: await response.blob(), contentType: response.headers.get("content-type"), disposition: response.headers.get("content-disposition") };
}

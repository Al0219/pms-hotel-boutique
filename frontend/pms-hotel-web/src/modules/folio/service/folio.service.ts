import { httpRequest } from "@/lib/http";

import type { FolioDto } from "../dtos/folio.dto";

export async function fetchFolioByIdDto(
  folioId: string,
  signal?: AbortSignal,
): Promise<FolioDto> {
  return httpRequest<FolioDto>({
    path: `/api/v1/private/folios/${encodeURIComponent(folioId)}`,
    method: "GET",
    signal,
  });
}

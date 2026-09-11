import { httpRequest } from "@/lib/http";

import type {
  ChargeRoutingRuleDto,
  CreateRoutingRuleRequestDto,
  FolioDto,
  SplitChargeRequestDto,
  SplitChargeResultDto,
  TransferChargeRequestDto,
  TransferChargeResultDto,
} from "../dtos/folio.dto";

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

export async function splitFolioChargeDto(
  folioId: string,
  payload: SplitChargeRequestDto,
  signal?: AbortSignal,
): Promise<SplitChargeResultDto> {
  return httpRequest<SplitChargeResultDto>({
    path: `/api/v1/private/folios/${encodeURIComponent(folioId)}/split-charge`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
}

export async function transferFolioChargeDto(
  folioId: string,
  payload: TransferChargeRequestDto,
  signal?: AbortSignal,
): Promise<TransferChargeResultDto> {
  return httpRequest<TransferChargeResultDto>({
    path: `/api/v1/private/folios/${encodeURIComponent(folioId)}/transfer-charge`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
}

export async function createChargeRoutingRuleDto(
  folioId: string,
  payload: CreateRoutingRuleRequestDto,
  signal?: AbortSignal,
): Promise<ChargeRoutingRuleDto> {
  return httpRequest<ChargeRoutingRuleDto>({
    path: `/api/v1/private/folios/${encodeURIComponent(folioId)}/routing-rules`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
}

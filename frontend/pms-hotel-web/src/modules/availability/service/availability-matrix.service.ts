import { httpRequest } from "@/lib/http";

import type {
  AvailabilityMatrixQueryDto,
  AvailabilityMatrixResponseDto,
} from "../dtos/availability.dto";

export async function fetchAvailabilityMatrixDto(
  query: AvailabilityMatrixQueryDto,
  signal?: AbortSignal,
): Promise<AvailabilityMatrixResponseDto> {
  const params = new URLSearchParams();
  params.set("property_id", query.property_id);
  params.set("start_date", query.start_date);
  params.set("end_date", query.end_date);
  if (query.room_type_id) {
    params.set("room_type_id", query.room_type_id);
  }

  return httpRequest<AvailabilityMatrixResponseDto>({
    path: `/api/v1/private/availability/matrix?${params.toString()}`,
    method: "GET",
    signal,
  });
}

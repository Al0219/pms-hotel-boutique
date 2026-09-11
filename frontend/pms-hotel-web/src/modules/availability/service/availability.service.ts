import { httpRequest } from "@/lib/http";

import type {
  AvailabilityResponseDto,
  AvailabilitySearchQueryDto,
} from "../dtos/availability.dto";

export async function fetchAvailabilityDto(
  query: AvailabilitySearchQueryDto,
  signal?: AbortSignal,
): Promise<AvailabilityResponseDto> {
  const searchParams = new URLSearchParams();

  if (query.property_id) {
    searchParams.set("property_id", query.property_id);
  }
  searchParams.set("check_in_date", query.check_in_date);
  searchParams.set("check_out_date", query.check_out_date);
  searchParams.set("adults", String(query.adults));
  searchParams.set("children", String(query.children));
  searchParams.set("rooms_count", String(query.rooms_count));

  const path = `/api/v1/public/availability?${searchParams.toString()}`;

  return httpRequest<AvailabilityResponseDto>({
    path,
    method: "GET",
    signal,
  });
}

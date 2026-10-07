import { httpRequest } from "@/lib/http";
import type { PublicAvailabilityQueryDTO, PublicAvailabilityResponseDTO } from '../dtos/public-availability.dto';

export async function fetchBackendAvailabilityDto(query: PublicAvailabilityQueryDTO, signal?: AbortSignal): Promise<PublicAvailabilityResponseDTO> {
  const search = new URLSearchParams({ propertyId: query.propertyId, arrival: query.arrival, departure: query.departure, rooms: String(query.rooms) });
  // Always the same-origin Next BFF, regardless of the generic API base URL.
  const path = new URL(`/api/v1/public/availability?${search}`, window.location.origin).href;
  return httpRequest<PublicAvailabilityResponseDTO>({ path, method: 'GET', withAuth: false, signal });
}

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
    withAuth: false,
    signal,
  });
}

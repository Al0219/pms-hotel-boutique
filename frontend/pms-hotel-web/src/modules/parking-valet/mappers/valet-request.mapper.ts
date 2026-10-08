import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, requiredText } from "@/lib/mapper";

import type { ValetRequestDto } from "../dtos/valet-request.dto";
import { isValetRequestRequestType, isValetRequestStatus, type ValetRequest } from "../model/valet-request";

export function mapValetRequest(dto: ValetRequestDto): ValetRequest {
  const status = dto.status.trim();
  const requestType = dto.request_type.trim();

  if (!isValetRequestStatus(status)) {
    throw new DomainMappingError("INVALID_VALET_REQUEST_STATUS");
  }

  if (!isValetRequestRequestType(requestType)) {
    throw new DomainMappingError("INVALID_VALET_REQUEST_TYPE");
  }

  return {
    id: requiredText(dto.request_id, "INVALID_VALET_REQUEST_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_VALET_REQUEST_PROPERTY_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_VALET_REQUEST_GUEST_NAME"),
    vehicleDescription: requiredText(dto.vehicle_description, "INVALID_VALET_REQUEST_VEHICLE_DESCRIPTION"),
    requestType,
    status,
    parkingSpace: optionalText(dto.parking_space),
    notes: optionalText(dto.notes),
  };
}

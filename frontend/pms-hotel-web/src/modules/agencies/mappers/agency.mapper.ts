import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { AgencyDto } from "../dtos/agency.dto";
import type { Agency } from "../model/agency";

function requiredText(value: string, errorCode: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new DomainMappingError(errorCode);
  }

  return normalizedValue;
}

function optionalText(value: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue || null;
}

export function mapAgency(dto: AgencyDto): Agency {
  return {
    id: requiredText(dto.agency_id, "INVALID_AGENCY_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_AGENCY_PROPERTY_ID"),
    legalName: requiredText(dto.legal_name, "INVALID_AGENCY_LEGAL_NAME"),
    statusCode: requiredText(dto.status_code, "INVALID_AGENCY_STATUS_CODE"),
    contractReference: optionalText(dto.contract_reference),
    commissionReference: optionalText(dto.commission_reference),
    voucherReference: optionalText(dto.voucher_reference),
  };
}

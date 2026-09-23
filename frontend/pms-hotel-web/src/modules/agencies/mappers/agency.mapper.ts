import { optionalText, requiredText } from "@/lib/mapper";

import type { AgencyDto } from "../dtos/agency.dto";
import type { Agency } from "../model/agency";

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

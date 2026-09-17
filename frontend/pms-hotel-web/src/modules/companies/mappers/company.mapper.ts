import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { CompanyDto } from "../dtos/company.dto";
import type { Company } from "../model/company";

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

export function mapCompany(dto: CompanyDto): Company {
  return {
    id: requiredText(dto.company_id, "INVALID_COMPANY_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_COMPANY_PROPERTY_ID"),
    legalName: requiredText(dto.legal_name, "INVALID_COMPANY_LEGAL_NAME"),
    statusCode: requiredText(dto.status_code, "INVALID_COMPANY_STATUS_CODE"),
    agreementReference: optionalText(dto.agreement_reference),
    creditReference: optionalText(dto.credit_reference),
    directBillRequested: dto.direct_bill_requested === true,
  };
}

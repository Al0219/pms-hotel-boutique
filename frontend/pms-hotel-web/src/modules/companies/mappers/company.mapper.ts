import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, requiredText } from "@/lib/mapper";

import type { CompanyDto } from "../dtos/company.dto";
import { isCompanyStatus, type Company } from "../model/company";

export function mapCompany(dto: CompanyDto): Company {
  const status = dto.status_code.trim();

  if (!isCompanyStatus(status)) {
    throw new DomainMappingError("INVALID_COMPANY_STATUS");
  }

  return {
    id: requiredText(dto.company_id, "INVALID_COMPANY_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_COMPANY_PROPERTY_ID"),
    legalName: requiredText(dto.legal_name, "INVALID_COMPANY_LEGAL_NAME"),
    status,
    agreementReference: optionalText(dto.agreement_reference),
    creditReference: optionalText(dto.credit_reference),
    directBillRequested: dto.direct_bill_requested === true,
  };
}

export const COMPANY_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export function isCompanyStatus(value: string): value is CompanyStatus {
  return (COMPANY_STATUSES as readonly string[]).includes(value);
}

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
};

export interface Company {
  id: string;
  propertyId: string;
  legalName: string;
  status: CompanyStatus;
  agreementReference: string | null;
  creditReference: string | null;
  /** Whether a direct-bill request exists. This module never presents it as approved. */
  directBillRequested: boolean;
}

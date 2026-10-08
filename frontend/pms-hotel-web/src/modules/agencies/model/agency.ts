export const AGENCY_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type AgencyStatus = (typeof AGENCY_STATUSES)[number];

export function isAgencyStatus(value: string): value is AgencyStatus {
  return (AGENCY_STATUSES as readonly string[]).includes(value);
}

export const AGENCY_STATUS_LABELS: Record<AgencyStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
};

export interface Agency {
  id: string;
  propertyId: string;
  legalName: string;
  status: AgencyStatus;
  contractReference: string | null;
  commissionReference: string | null;
  voucherReference: string | null;
}

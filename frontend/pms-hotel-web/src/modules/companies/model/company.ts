export interface Company {
  id: string;
  propertyId: string;
  legalName: string;
  statusCode: string;
  agreementReference: string | null;
  creditReference: string | null;
  /** Whether a direct-bill request exists. This module never presents it as approved. */
  directBillRequested: boolean;
}

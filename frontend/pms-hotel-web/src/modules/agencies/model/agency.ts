export interface Agency {
  id: string;
  propertyId: string;
  legalName: string;
  statusCode: string;
  contractReference: string | null;
  commissionReference: string | null;
  voucherReference: string | null;
}

/**
 * Domain Model for Property (Hotel)
 * Reglas de dominio:
 * - Property define configuraciones base (moneda, zona horaria).
 * - Muchas entidades operativas (Reservation, RatePlan) están ligadas a un PropertyId.
 */

export interface FiscalSettings {
  taxId: string;
  legalName: string;
}

export interface BusinessDaySettings {
  checkInTime: string; // e.g. "15:00"
  checkOutTime: string; // e.g. "12:00"
  nightAuditTime: string; // e.g. "02:00"
}

export interface Property {
  propertyId: string;
  name: string;
  timezone: string;
  currency: string;
  fiscalSettings: FiscalSettings;
  businessDaySettings: BusinessDaySettings;
}

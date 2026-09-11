import { DomainMappingError } from "@/lib/errors";

import type {
  FolioChargeCategoryDto,
  FolioChargeDto,
  FolioDto,
  FolioPaymentEntryDto,
  FolioStatusDto,
  FolioTypeDto,
} from "../dtos/folio.dto";
import type {
  Folio,
  FolioCharge,
  FolioChargeCategory,
  FolioPaymentEntry,
  FolioStatus,
  FolioType,
} from "../model/folio";

const VALID_FOLIO_TYPES: ReadonlySet<string> = new Set<FolioTypeDto>([
  "GUEST",
  "COMPANY",
  "MASTER",
]);

const VALID_FOLIO_STATUSES: ReadonlySet<string> = new Set<FolioStatusDto>([
  "OPEN",
  "SETTLED",
  "CLOSED",
]);

const VALID_CHARGE_CATEGORIES: ReadonlySet<string> = new Set<FolioChargeCategoryDto>([
  "ROOM_NIGHT",
  "RESTAURANT",
  "SPA",
  "MINIBAR",
  "TAX",
  "SERVICE_FEE",
  "PARKING",
  "MISCELLANEOUS",
]);

function parseAmount(val: string | undefined | null, field: string): number {
  if (val === undefined || val === null || val.trim() === "") {
    throw new DomainMappingError(`MISSING_AMOUNT_${field.toUpperCase()}`);
  }
  const parsed = Number(val);
  if (!Number.isFinite(parsed)) {
    throw new DomainMappingError(`INVALID_AMOUNT_${field.toUpperCase()}`);
  }
  return parsed;
}

export function mapFolioChargeDtoToDomain(dto: FolioChargeDto): FolioCharge {
  if (!dto || typeof dto.charge_id !== "string" || !dto.charge_id.trim()) {
    throw new DomainMappingError("MISSING_CHARGE_ID");
  }

  if (!dto.category || !VALID_CHARGE_CATEGORIES.has(dto.category)) {
    throw new DomainMappingError("INVALID_CHARGE_CATEGORY");
  }

  if (typeof dto.description !== "string" || !dto.description.trim()) {
    throw new DomainMappingError("MISSING_CHARGE_DESCRIPTION");
  }

  const amount = parseAmount(dto.amount, "charge_amount");
  const postedAt = new Date(dto.posted_at);
  if (Number.isNaN(postedAt.getTime())) {
    throw new DomainMappingError("INVALID_POSTED_AT");
  }

  return {
    chargeId: dto.charge_id.trim(),
    category: dto.category as FolioChargeCategory,
    description: dto.description.trim(),
    amount,
    currency: (dto.currency || "USD").trim().toUpperCase(),
    postedAt,
    postedBy: (dto.posted_by || "system").trim(),
    isVoided: Boolean(dto.is_voided),
  };
}

export function mapFolioPaymentEntryDtoToDomain(dto: FolioPaymentEntryDto): FolioPaymentEntry {
  if (!dto || typeof dto.payment_entry_id !== "string" || !dto.payment_entry_id.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_ENTRY_ID");
  }

  if (typeof dto.payment_id !== "string" || !dto.payment_id.trim()) {
    throw new DomainMappingError("MISSING_PAYMENT_ID");
  }

  const amount = parseAmount(dto.amount, "payment_entry_amount");
  const paidAt = new Date(dto.paid_at);
  if (Number.isNaN(paidAt.getTime())) {
    throw new DomainMappingError("INVALID_PAID_AT");
  }

  return {
    paymentEntryId: dto.payment_entry_id.trim(),
    paymentId: dto.payment_id.trim(),
    amount,
    currency: (dto.currency || "USD").trim().toUpperCase(),
    method: (dto.method || "CREDIT_CARD").trim(),
    paidAt,
    reference: dto.reference ?? null,
  };
}

export function mapFolioDtoToDomain(dto: FolioDto): Folio {
  if (!dto || typeof dto.folio_id !== "string" || !dto.folio_id.trim()) {
    throw new DomainMappingError("MISSING_FOLIO_ID");
  }

  if (!dto.type || !VALID_FOLIO_TYPES.has(dto.type)) {
    throw new DomainMappingError("INVALID_FOLIO_TYPE");
  }

  if (!dto.status || !VALID_FOLIO_STATUSES.has(dto.status)) {
    throw new DomainMappingError("INVALID_FOLIO_STATUS");
  }

  const charges = Array.isArray(dto.charges) ? dto.charges.map(mapFolioChargeDtoToDomain) : [];
  const payments = Array.isArray(dto.payments) ? dto.payments.map(mapFolioPaymentEntryDtoToDomain) : [];

  const createdAt = new Date(dto.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    throw new DomainMappingError("INVALID_FOLIO_CREATED_AT");
  }

  const calculatedCharges = charges
    .filter((c) => !c.isVoided)
    .reduce((acc, c) => acc + c.amount, 0);

  const calculatedPayments = payments.reduce((acc, p) => acc + p.amount, 0);
  const calculatedBalance = Math.round((calculatedCharges - calculatedPayments) * 100) / 100;

  return {
    folioId: dto.folio_id.trim(),
    folioNumber: (dto.folio_number || dto.folio_id).trim(),
    reservationId: (dto.reservation_id || "").trim(),
    stayId: (dto.stay_id || "").trim(),
    type: dto.type as FolioType,
    status: dto.status as FolioStatus,
    holderName: (dto.holder_name || "").trim(),
    roomNumber: (dto.room_number || "").trim(),
    currency: (dto.currency || "USD").trim().toUpperCase(),
    totalCharges: calculatedCharges,
    totalPayments: calculatedPayments,
    balance: calculatedBalance,
    charges,
    payments,
    createdAt,
  };
}

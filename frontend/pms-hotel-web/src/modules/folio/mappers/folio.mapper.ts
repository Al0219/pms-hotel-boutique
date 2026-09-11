import { DomainMappingError } from "@/lib/errors";

import type {
  ChargeRoutingRuleDto,
  FolioChargeCategoryDto,
  FolioChargeDto,
  FolioDto,
  FolioPaymentEntryDto,
  FolioStatusDto,
  FolioTypeDto,
  SplitChargePortionDto,
  SplitChargeRequestDto,
  SplitChargeResultDto,
} from "../dtos/folio.dto";
import type {
  ChargeRoutingRule,
  Folio,
  FolioCharge,
  FolioChargeCategory,
  FolioPaymentEntry,
  FolioStatus,
  FolioType,
  SplitChargePortion,
  SplitChargeRequest,
  SplitChargeResult,
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
    originalSplitChargeId: dto.original_split_charge_id ?? null,
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

export function mapChargeRoutingRuleDtoToDomain(dto: ChargeRoutingRuleDto): ChargeRoutingRule {
  if (!dto || typeof dto.rule_id !== "string" || !dto.rule_id.trim()) {
    throw new DomainMappingError("MISSING_ROUTING_RULE_ID");
  }
  if (!dto.category || !VALID_CHARGE_CATEGORIES.has(dto.category)) {
    throw new DomainMappingError("INVALID_ROUTING_CATEGORY");
  }
  const percentage = Number(dto.percentage);
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    throw new DomainMappingError("INVALID_ROUTING_PERCENTAGE");
  }
  const createdAt = new Date(dto.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    throw new DomainMappingError("INVALID_ROUTING_CREATED_AT");
  }

  return {
    ruleId: dto.rule_id.trim(),
    sourceFolioId: (dto.source_folio_id || "").trim(),
    targetFolioId: (dto.target_folio_id || "").trim(),
    category: dto.category as FolioChargeCategory,
    percentage,
    createdAt,
  };
}

export function mapSplitChargePortionToDto(portion: SplitChargePortion): SplitChargePortionDto {
  if (!portion || typeof portion.targetFolioId !== "string" || !portion.targetFolioId.trim()) {
    throw new DomainMappingError("MISSING_SPLIT_TARGET_FOLIO");
  }
  if (!Number.isFinite(portion.amount) || portion.amount <= 0) {
    throw new DomainMappingError("INVALID_SPLIT_PORTION_AMOUNT");
  }
  return {
    target_folio_id: portion.targetFolioId.trim(),
    amount: portion.amount.toFixed(2),
    description: portion.description?.trim(),
  };
}

export function mapSplitChargeRequestToDto(request: SplitChargeRequest): SplitChargeRequestDto {
  if (!request || typeof request.chargeId !== "string" || !request.chargeId.trim()) {
    throw new DomainMappingError("MISSING_SPLIT_CHARGE_ID");
  }
  if (!Array.isArray(request.portions) || request.portions.length < 2) {
    throw new DomainMappingError("MINIMUM_TWO_PORTIONS_REQUIRED");
  }
  return {
    charge_id: request.chargeId.trim(),
    portions: request.portions.map(mapSplitChargePortionToDto),
  };
}

export function mapSplitChargeResultDtoToDomain(dto: SplitChargeResultDto): SplitChargeResult {
  if (!dto || typeof dto.original_charge_id !== "string" || !dto.original_charge_id.trim()) {
    throw new DomainMappingError("MISSING_ORIGINAL_CHARGE_ID");
  }

  const createdCharges = Array.isArray(dto.created_charges)
    ? dto.created_charges.map(mapFolioChargeDtoToDomain)
    : [];

  const updatedSourceFolio = mapFolioDtoToDomain(dto.updated_source_folio);

  return {
    originalChargeId: dto.original_charge_id.trim(),
    sourceFolioId: (dto.source_folio_id || "").trim(),
    createdCharges,
    updatedSourceFolio,
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
  const routingRules = Array.isArray(dto.routing_rules) ? dto.routing_rules.map(mapChargeRoutingRuleDtoToDomain) : undefined;

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
    routingRules,
    createdAt,
  };
}

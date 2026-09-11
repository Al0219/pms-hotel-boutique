/**
 * Public API for the folio module (WEB-4).
 * Export only intentionally public Domain Models, mappers, services and components.
 */

export type {
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
} from "./model/folio";

export type {
  ChargeRoutingRuleDto,
  CreateRoutingRuleRequestDto,
  FolioChargeCategoryDto,
  FolioChargeDto,
  FolioDto,
  FolioPaymentEntryDto,
  FolioStatusDto,
  FolioTypeDto,
  SplitChargePortionDto,
  SplitChargeRequestDto,
  SplitChargeResultDto,
} from "./dtos/folio.dto";

export {
  mapChargeRoutingRuleDtoToDomain,
  mapFolioChargeDtoToDomain,
  mapFolioDtoToDomain,
  mapFolioPaymentEntryDtoToDomain,
  mapSplitChargePortionToDto,
  mapSplitChargeRequestToDto,
  mapSplitChargeResultDtoToDomain,
} from "./mappers/folio.mapper";

export {
  createChargeRoutingRuleDto,
  fetchFolioByIdDto,
  splitFolioChargeDto,
} from "./service/folio.service";

export {
  FolioDetailCard,
} from "./components/folio-detail-card";
export type {
  FolioDetailCardProps,
} from "./components/folio-detail-card";

export {
  FolioSplitModal,
} from "./components/folio-split-modal";
export type {
  FolioSplitModalProps,
} from "./components/folio-split-modal";

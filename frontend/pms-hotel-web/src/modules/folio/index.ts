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
  TransferChargeRequest,
  TransferChargeResult,
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
  TransferChargeRequestDto,
  TransferChargeResultDto,
} from "./dtos/folio.dto";

export {
  mapChargeRoutingRuleDtoToDomain,
  mapFolioChargeDtoToDomain,
  mapFolioDtoToDomain,
  mapFolioPaymentEntryDtoToDomain,
  mapSplitChargePortionToDto,
  mapSplitChargeRequestToDto,
  mapSplitChargeResultDtoToDomain,
  mapTransferChargeRequestToDto,
  mapTransferChargeResultDtoToDomain,
} from "./mappers/folio.mapper";

export {
  createChargeRoutingRuleDto,
  fetchFolioByIdDto,
  splitFolioChargeDto,
  transferFolioChargeDto,
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

export {
  FolioTransferModal,
} from "./components/folio-transfer-modal";
export type {
  FolioTransferModalProps,
} from "./components/folio-transfer-modal";

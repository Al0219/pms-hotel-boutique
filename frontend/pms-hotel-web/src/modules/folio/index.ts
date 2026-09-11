/**
 * Public API for the folio module (WEB-4).
 * Export only intentionally public Domain Models, mappers, services and components.
 */

export type {
  Folio,
  FolioCharge,
  FolioChargeCategory,
  FolioPaymentEntry,
  FolioStatus,
  FolioType,
} from "./model/folio";

export type {
  FolioChargeCategoryDto,
  FolioChargeDto,
  FolioDto,
  FolioPaymentEntryDto,
  FolioStatusDto,
  FolioTypeDto,
} from "./dtos/folio.dto";

export {
  mapFolioChargeDtoToDomain,
  mapFolioDtoToDomain,
  mapFolioPaymentEntryDtoToDomain,
} from "./mappers/folio.mapper";

export {
  fetchFolioByIdDto,
} from "./service/folio.service";

export {
  FolioDetailCard,
} from "./components/folio-detail-card";
export type {
  FolioDetailCardProps,
} from "./components/folio-detail-card";

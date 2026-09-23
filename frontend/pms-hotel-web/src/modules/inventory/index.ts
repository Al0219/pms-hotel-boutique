/**
 * Public API for the inventory module (WEB-4).
 * Regla de dominio: Physical Room count permanece inalterado; el ATS es recalculado.
 */

export type {
  SellLimitDto,
  UpdateSellLimitRequestDto,
  SellLimitListResponseDto,
} from "./dtos/sell-limit.dto";

export type {
  SellLimit,
  UpdateSellLimitParams,
} from "./model/sell-limit";

export {
  calculateSellableATS,
} from "./model/sell-limit";

export {
  toDomainSellLimit,
  toDomainSellLimitList,
  toDtoUpdateSellLimit,
} from "./mappers/sell-limit.mapper";

export {
  fetchSellLimits,
  updateSellLimit,
} from "./service/sell-limit.service";

export {
  SellLimitsManager,
  type SellLimitsManagerProps,
} from "./components/sell-limits-manager";

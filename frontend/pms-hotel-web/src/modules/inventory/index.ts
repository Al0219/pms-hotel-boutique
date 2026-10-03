/**
 * Public API for the inventory module (WEB-4).
 * Regla de dominio: Physical Room count permanece inalterado; el ATS es recalculado.
 */

export type {
  SellLimitDto,
  UpdateSellLimitRequestDto,
  SellLimitListResponseDto,
  SellLimitListQueryDto,
} from "./dtos/sell-limit.dto";

export type {
  SellLimit,
  UpdateSellLimitParams,
} from "./model/sell-limit";

export {
  calculateSellableATS,
} from "./model/sell-limit";

export {
  useSellLimits,
  type UseSellLimitsResult,
} from "./hooks/use-sell-limits";

export {
  fetchSellLimitsDto,
  updateSellLimitDto,
  fetchSellLimits,
  updateSellLimit,
} from "./service/sell-limit.service";

export {
  InventoryPage,
} from "./components/inventory-page";

export {
  SellLimitsManager,
  type SellLimitsManagerProps,
} from "./components/sell-limits-manager";

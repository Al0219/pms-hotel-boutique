import { type TransferFareEstimate, type TransferRouteEstimate } from '@/modules/valet/domain/models/ValetScreen';

export const transferFareConfig = {
  baseFare: 40,
  pricePerKm: 8,
} as const;

/** Deterministic frontend/mock fare rule. It is neither a payment nor a fiscal rate. */
export function calculateTransferFare(route: TransferRouteEstimate): TransferFareEstimate {
  const estimatedPrice = Math.round(
    transferFareConfig.baseFare + (transferFareConfig.pricePerKm * route.distanceKm),
  );

  return { estimatedPrice, estimatedPriceText: `Q ${estimatedPrice}` };
}

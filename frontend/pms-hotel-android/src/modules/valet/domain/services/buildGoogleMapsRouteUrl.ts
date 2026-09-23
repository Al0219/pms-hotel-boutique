import { type TransferPlace } from '@/modules/valet/domain/models/ValetScreen';

function coordinatePair(place: TransferPlace): string {
  return `${place.latitude},${place.longitude}`;
}

/** Builds an external visual-only Google Maps directions URL; no API key is used. */
export function buildGoogleMapsRouteUrl(origin: TransferPlace, destination: TransferPlace): string {
  const originParam = encodeURIComponent(coordinatePair(origin));
  const destinationParam = encodeURIComponent(coordinatePair(destination));

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}`;
}

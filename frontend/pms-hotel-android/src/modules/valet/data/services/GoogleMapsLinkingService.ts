import { Linking } from 'react-native';

import { type TransferPlace } from '@/modules/valet/domain/models/ValetScreen';
import { buildGoogleMapsRouteUrl } from '@/modules/valet/domain/services/buildGoogleMapsRouteUrl';

export interface ExternalMapService {
  openRoute(origin: TransferPlace, destination: TransferPlace): Promise<boolean>;
}

interface LinkingAdapter {
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<unknown>;
}

/** Opens a visual-only external route. It does not return places or route data to the PMS. */
export class GoogleMapsLinkingService implements ExternalMapService {
  public constructor(private readonly linking: LinkingAdapter = Linking) {}

  public async openRoute(origin: TransferPlace, destination: TransferPlace): Promise<boolean> {
    const url = buildGoogleMapsRouteUrl(origin, destination);

    try {
      if (!await this.linking.canOpenURL(url)) return false;
      await this.linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}

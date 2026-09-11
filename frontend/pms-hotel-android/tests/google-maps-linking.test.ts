import { GoogleMapsLinkingService } from '@/modules/valet/data/services/GoogleMapsLinkingService';
import { buildGoogleMapsRouteUrl } from '@/modules/valet/domain/services/buildGoogleMapsRouteUrl';

const hotel = { key: 'hotel', displayText: 'Hotel', latitude: 14.5987, longitude: -90.5138, type: 'HOTEL' as const };
const place = { key: 'place', displayText: 'Aeropuerto Internacional La Aurora', latitude: 14.5833, longitude: -90.5275, type: 'PLACE' as const };

describe('Google Maps external visualization', () => {
  it('builds an encoded directions URL from coordinates without an API key', () => {
    expect(buildGoogleMapsRouteUrl(hotel, place)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=14.5987%2C-90.5138&destination=14.5833%2C-90.5275',
    );
  });

  it('checks and opens the external URL through Linking', async () => {
    const canOpenURL = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const openURL = jest.fn<Promise<void>, [string]>().mockResolvedValue();
    const service = new GoogleMapsLinkingService({ canOpenURL, openURL });

    await expect(service.openRoute(hotel, place)).resolves.toBe(true);
    expect(canOpenURL).toHaveBeenCalledWith(expect.stringContaining('origin=14.5987%2C-90.5138'));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('destination=14.5833%2C-90.5275'));
  });

  it('returns false if Linking cannot open or rejects the external URL', async () => {
    const canOpenURL = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    const openURL = jest.fn<Promise<void>, [string]>();
    const service = new GoogleMapsLinkingService({ canOpenURL, openURL });
    await expect(service.openRoute(hotel, place)).resolves.toBe(false);

    canOpenURL.mockResolvedValue(true);
    openURL.mockRejectedValue(new Error('unavailable'));
    await expect(service.openRoute(hotel, place)).resolves.toBe(false);
  });
});

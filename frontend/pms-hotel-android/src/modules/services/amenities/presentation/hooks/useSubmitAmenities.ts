import { useMutation } from '@tanstack/react-query';

import { MockAmenitiesService } from '@/modules/services/amenities/data/mocks/MockAmenitiesService';
import { type AmenitiesService } from '@/modules/services/amenities/data/services/AmenitiesService';
import { type AmenitiesRequest } from '@/modules/services/amenities/domain/AmenitiesRequest';

const defaultService: AmenitiesService = new MockAmenitiesService();

export function useSubmitAmenities(service: AmenitiesService = defaultService) {
  return useMutation({ mutationFn: (input: AmenitiesRequest) => service.submitRequest(input), retry: false });
}

import { type AmenitiesRequest } from '@/modules/services/amenities/domain/AmenitiesRequest';

export interface AmenitiesService {
  submitRequest(input: AmenitiesRequest): Promise<void>;
}

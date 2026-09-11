import { useMutation } from '@tanstack/react-query';

import { mapReserveTransferFixtureResult, mapReserveTransferInputToFixtureDto } from '@/modules/valet/data/mappers/mapValetFixtureDto';
import { MockValetService } from '@/modules/valet/data/mocks/MockValetService';
import { type ValetService } from '@/modules/valet/data/services/ValetService';
import { type ReserveTransferInput, type TransferReservationResult } from '@/modules/valet/domain/models/ValetScreen';

const defaultValetService: ValetService = new MockValetService();

export function useReserveTransfer(service: ValetService = defaultValetService) {
  return useMutation({
    mutationFn: async (input: ReserveTransferInput): Promise<TransferReservationResult> => mapReserveTransferFixtureResult(
      await service.reserveTransfer(mapReserveTransferInputToFixtureDto(input)),
    ),
    retry: false,
  });
}

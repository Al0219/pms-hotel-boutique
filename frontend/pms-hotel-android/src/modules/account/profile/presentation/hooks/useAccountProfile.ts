import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mapAccountProfileFixtureDto, mapAccountProfileUpdateFixtureResult, mapAccountProfileUpdateInput } from '@/modules/account/profile/data/mappers/mapAccountProfileFixtureDto';
import { MockAccountProfileService } from '@/modules/account/profile/data/mocks/MockAccountProfileService';
import { type AccountProfileService } from '@/modules/account/profile/data/services/AccountProfileService';
import { type AccountProfile, type AccountProfileUpdateInput } from '@/modules/account/profile/domain/AccountProfile';

export const accountProfileQueryKey = ['account', 'profile'] as const;
const service = new MockAccountProfileService();
export function useAccountProfile(override: AccountProfileService = service) { return useQuery({ queryKey: accountProfileQueryKey, queryFn: async () => mapAccountProfileFixtureDto(await override.getAccountProfile()), retry: false }); }
export function useUpdateAccountProfile(override: AccountProfileService = service) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (input: AccountProfileUpdateInput) => mapAccountProfileUpdateFixtureResult(await override.updateAccountProfile(mapAccountProfileUpdateInput(input))), onSuccess: (result) => { queryClient.setQueryData<AccountProfile>(accountProfileQueryKey, { account: result.account, profile: result.profile }); }, retry: false });
}

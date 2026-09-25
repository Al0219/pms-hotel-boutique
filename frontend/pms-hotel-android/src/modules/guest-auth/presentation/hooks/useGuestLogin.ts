import { type MutateOptions, useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { MockGuestAuthService } from '@/modules/guest-auth/data/mocks/MockGuestAuthService';
import { type GuestAuthService } from '@/modules/guest-auth/data/services/GuestAuthService';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { type GuestLoginRequest } from '@/modules/guest-auth/domain/models/GuestLoginRequest';

const defaultGuestAuthService: GuestAuthService = new MockGuestAuthService();

/** Keeps credentials out of TanStack mutation variables and clears them as soon as the call settles. */
export function useGuestLogin(service: GuestAuthService = defaultGuestAuthService) {
  const requestRef = useRef<GuestLoginRequest | null>(null);
  const mutation = useMutation<GuestAuthSession, Error, void>({
    mutationFn: async () => {
      const request = requestRef.current;
      if (!request) throw new Error('Guest Login request is unavailable');
      try {
        return await service.login(request);
      } finally {
        requestRef.current = null;
      }
    },
    retry: false,
  });

  const submit = useCallback((request: GuestLoginRequest, options?: MutateOptions<GuestAuthSession, Error, void>) => {
    requestRef.current = request;
    mutation.mutate(undefined, options);
  }, [mutation]);

  return { ...mutation, submit };
}

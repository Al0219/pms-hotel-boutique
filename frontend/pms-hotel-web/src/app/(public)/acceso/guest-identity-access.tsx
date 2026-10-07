'use client';

import { GuestAccessPage, GuestLinkedAccount, useGuestSession } from '@/modules/auth';
import { useAccountSummary } from '@/modules/account';

/** App composition keeps account/profile data out of the authentication module and session. */
function AccountConfirmation({ returnTo }: { returnTo?: string }) {
  const { accessMethod } = useGuestSession();
  const query = useAccountSummary();
  const summary = query.data;
  const profileName = summary?.source === 'mock' ? summary.guestName : (() => {
    const profile = summary?.profiles.find(item => item.id === summary.profileId);
    return profile ? `${profile.firstName} ${profile.lastName}` : undefined;
  })();
  return <GuestLinkedAccount authProvider={accessMethod === 'EMAIL' ? 'email' : 'google'} returnTo={returnTo}
    details={{ profileName, isActive: summary?.isActive, linkedReservationsCount: summary?.linkedReservationsCount,
      state: query.error || query.fetchStatus === 'paused' ? 'error' : query.isPending ? 'loading' : 'ready',
      onRetry: () => void query.refetch() }} />;
}

export function GuestIdentityAccess({ returnTo }: { returnTo?: string }) {
  return <GuestAccessPage returnTo={returnTo} confirmation={<AccountConfirmation returnTo={returnTo} />} />;
}

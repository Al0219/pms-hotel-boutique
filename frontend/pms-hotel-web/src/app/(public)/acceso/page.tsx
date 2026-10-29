import {cookies} from 'next/headers';
import {pendingRegistration,registrationCookie} from '@/lib/bff/guest-registration';
import { GuestIdentityAccess } from './guest-identity-access';

export default async function AccessPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo, error, from } = await searchParams;
  const pending=pendingRegistration((await cookies()).get(registrationCookie)?.value);
  return <GuestIdentityAccess afterStaffActivation={from === 'staff-activation'} pendingRequestId={pending?.requestId} returnTo={typeof returnTo === 'string' ? returnTo : undefined} googleError={error === 'google'} />;
}

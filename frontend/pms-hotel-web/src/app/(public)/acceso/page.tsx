import { GuestIdentityAccess } from './guest-identity-access';

export default async function AccessPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo, error } = await searchParams;
  return <GuestIdentityAccess returnTo={typeof returnTo === 'string' ? returnTo : undefined} googleError={error === 'google'} />;
}

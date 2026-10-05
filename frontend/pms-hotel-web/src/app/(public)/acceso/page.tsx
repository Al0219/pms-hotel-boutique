import { GuestAccessPage } from '@/modules/auth';

export default async function AccessPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo } = await searchParams;
  return <GuestAccessPage returnTo={typeof returnTo === 'string' ? returnTo : undefined} />;
}

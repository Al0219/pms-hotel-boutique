import { redirect } from 'next/navigation';
import { navigationFilters } from '../filters';

/** Legacy links return to the guarded list; an arbitrary target ID never triggers a read. */
export default async function StaffUserPage({ searchParams }: {
  params: Promise<{ staffUserId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = navigationFilters(await searchParams);
  const query = new URLSearchParams();
  if (filters.username) query.set('username', filters.username);
  if (filters.roleCode) query.set('roleCode', filters.roleCode);
  if (filters.status) query.set('status', filters.status);
  if (filters.limit !== 50) query.set('limit', String(filters.limit));
  redirect(`/seguridad/usuarios${query.size ? `?${query}` : ''}`);
}

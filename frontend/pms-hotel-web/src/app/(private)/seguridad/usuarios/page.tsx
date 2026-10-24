import { StaffAdminWorkspace } from '@/modules/staff';
import { navigationFilters } from './filters';
export default async function StaffUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <StaffAdminWorkspace initial={navigationFilters(await searchParams)} />;
}

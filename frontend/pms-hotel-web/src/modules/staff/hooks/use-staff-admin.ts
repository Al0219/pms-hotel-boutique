'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRevalidateStaffSession, type StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import { HttpStatusError } from '@/lib/http/errors';
import { mapStaffAdminContext, mapStaffAdminDetail, mapStaffAdminPage, StaffAdminContextMismatch } from '../mappers/staff-admin.mapper';
import { readStaffAdminRoles, readStaffAdminUser, readStaffAdminUsers } from '../service/staff-admin.service';
import type { StaffAdminFilters } from '../model/staff-admin';

export function staffAdminIdentity(session: StaffSession) {
  return JSON.stringify([session.id, session.staffUserId, session.roleId, [...session.permissions].sort(),
    session.memberships.filter(item => item.active).map(item => item.propertyId).sort()]);
}
export function staffAdminBaseKey(session: StaffSession) { return ['staff-admin', session.id, session.staffUserId, staffAdminIdentity(session)]; }
export function staffAdminReadContext(session: StaffSession, scope: PropertyScope, organizationId: string) {
  return { organizationId, scope, role: session.roleId, authorizedPropertyIds: session.memberships.filter(item => item.active).map(item => item.propertyId) };
}
function useReadFailure(error: unknown) {
  const client = useQueryClient(), revalidate = useRevalidateStaffSession();
  useEffect(() => {
    if (error instanceof StaffAdminContextMismatch || (error instanceof HttpStatusError && [401, 403].includes(error.status))) {
      void client.cancelQueries({ queryKey: ['staff-admin'] });
      void revalidate();
    }
  }, [error, client, revalidate]);
}
export function useStaffAdmin(session: StaffSession, scope: PropertyScope, filters: StaffAdminFilters, cursor: string | null, active = true) {
  const base = staffAdminBaseKey(session);
  const context = useQuery({ queryKey: [...base, 'context'],
    queryFn: async ({ signal }) => mapStaffAdminContext(await readStaffAdminRoles(signal)),
    enabled: active, refetchOnWindowFocus: false, retry: false, gcTime: 0, staleTime: 0 });
  const organizationId = context.data?.organizationId;
  const prefix = [...base, organizationId, scope.kind, [...scope.propertyIds].sort(), 'users'];
  const query = useQuery({
    queryKey: [...prefix, filters, cursor],
    enabled: active && context.isSuccess && !context.isFetching, retry: false, gcTime: 0, staleTime: 0,
    queryFn: async ({ signal }) => mapStaffAdminPage(await readStaffAdminUsers(scope, filters, cursor, signal), staffAdminReadContext(session, scope, organizationId!), filters.limit),
    // Only a username change on page one may temporarily retain presentation.
    // Never bridge identity, organization, permission, scope, role, status or size.
    placeholderData: (previous, previousQuery) => {
      const oldKey = previousQuery?.queryKey;
      const oldFilters = oldKey?.[8] as StaffAdminFilters | undefined;
      return oldKey && JSON.stringify(oldKey.slice(0, 8)) === JSON.stringify(prefix)
        && cursor === null && oldKey[9] === null && oldFilters
        && oldFilters.username !== filters.username && oldFilters.roleCode === filters.roleCode
        && oldFilters.status === filters.status && oldFilters.limit === filters.limit ? previous : undefined;
    },
  });
  const error = context.error ?? query.error;
  useReadFailure(error);
  return { context, query, error, loading: context.isPending || context.isFetching || query.isPending || query.isFetching,
    retry: () => (context.isError || error instanceof StaffAdminContextMismatch) ? void context.refetch() : void query.refetch() };
}
/** Mounted exclusively by an expanded row; no catalog duplicate or detail prefetch. */
export function useStaffAdminDetail(session: StaffSession, scope: PropertyScope, organizationId: string, id: string, active = true) {
  const query = useQuery({ queryKey: [...staffAdminBaseKey(session), organizationId, scope.kind, [...scope.propertyIds].sort(), 'detail', id],
    queryFn: async ({ signal }) => mapStaffAdminDetail(await readStaffAdminUser(id, scope, signal), staffAdminReadContext(session, scope, organizationId), id),
    enabled: active, retry: false, gcTime: 0, staleTime: 30_000, refetchOnWindowFocus: false });
  useReadFailure(active ? query.error : null);
  return query;
}

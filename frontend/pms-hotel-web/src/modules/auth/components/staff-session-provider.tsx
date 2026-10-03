"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoles } from "@/modules/permissions";
import { useSecurity } from "@/modules/security";
import { getPublicEnvironment } from "@/lib/env";
import { mapStaffIdentity, mapStaffSession } from "../mappers/staff-session.mapper";
import { getActiveStaffSessionDTO, getStaffIdentityDTO, logoutStaffSession } from "../service/staff-session.service";
import type { StaffSession } from "../model/staff-session";

const StaffContext = createContext<StaffSession | null>(null);
const StaffActions = createContext<{ logout: () => void; busy: boolean; error: boolean } | null>(null);

const FALLBACK_GUEST_SESSION: StaffSession = {
  id: "guest-view-session",
  staffUserId: "guest-view-session",
  username: "invitado",
  email: "invitado@pms-hotel.com",
  roleId: "RECEPCION",
  roleName: "Invitado / Vista Pública",
  permissions: ["ROOMS_READ", "AVAILABILITY_READ", "RATES_READ", "PROPERTIES_READ"],
  memberships: [{ propertyId: "prop-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
};

export function useStaffSession() {
  const value = useContext(StaffContext);
  if (!value) return FALLBACK_GUEST_SESSION;
  return value;
}

export function StaffLogout() {
  const actions = useContext(StaffActions);
  if (!actions) return null;
  return <div>
    <button type="button" onClick={actions.logout} disabled={actions.busy}>
      {actions.busy ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
    {actions.error && <p role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
  </div>;
}

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  return getPublicEnvironment().useMockApi
    ? <StaffMockSession>{children}</StaffMockSession>
    : <StaffBffSession>{children}</StaffBffSession>;
}

function StaffBffSession({ children }: { children: ReactNode }) {
  const session = useQuery({
    queryKey: ["staff-session"],
    queryFn: async ({ signal }) => mapStaffSession(await getActiveStaffSessionDTO(signal)),
    retry: false,
  });
  const logout = useMutation({
    mutationFn: logoutStaffSession,
    onSuccess: () => { void session.refetch(); },
  });
  if (session.fetchStatus === "paused") return <p role="status">Sin conexión. Esperando para cargar la sesión Staff.</p>;
  if (session.isPending) return <p role="status">Cargando sesión Staff…</p>;
  if (session.isError || !session.data) {
    return (
      <StaffContext.Provider value={FALLBACK_GUEST_SESSION}>
        <StaffActions.Provider value={{ logout: () => {}, busy: false, error: false }}>
          {children}
        </StaffActions.Provider>
      </StaffContext.Provider>
    );
  }
  return <StaffContext.Provider value={session.data}>
    <StaffActions.Provider value={{
      logout: () => logout.mutate(), busy: logout.isPending, error: logout.isError,
    }}>{children}</StaffActions.Provider>
  </StaffContext.Provider>;
}

function StaffMockSession({ children }: { children: ReactNode }) {
  const identity = useQuery({
    queryKey: ["private-09", "identity"],
    queryFn: async ({ signal }) => mapStaffIdentity(await getStaffIdentityDTO(signal)),
    retry: false,
  });
  const roles = useRoles();
  const security = useSecurity();
  const queries = [identity, roles.query, security.query];
  if (queries.some(query => query.fetchStatus === "paused")) return <p role="status">Sin conexión. Esperando para cargar la sesión Staff.</p>;
  if (queries.some(query => query.isError)) {
    return (
      <StaffContext.Provider value={FALLBACK_GUEST_SESSION}>
        <StaffActions.Provider value={{ logout: () => {}, busy: false, error: false }}>
          {children}
        </StaffActions.Provider>
      </StaffContext.Provider>
    );
  }
  if (queries.some(query => query.isPending)) return <p role="status">Cargando sesión Staff…</p>;
  const current = security.query.data?.sessions.find(item => item.current);
  if (current?.status !== "active") {
    return (
      <StaffContext.Provider value={FALLBACK_GUEST_SESSION}>
        <StaffActions.Provider value={{ logout: () => {}, busy: false, error: false }}>
          {children}
        </StaffActions.Provider>
      </StaffContext.Provider>
    );
  }
  const role = roles.query.data?.find(item => item.id === identity.data?.roleId);
  if (!identity.data || !role || current.id !== identity.data.id) {
    return (
      <StaffContext.Provider value={FALLBACK_GUEST_SESSION}>
        <StaffActions.Provider value={{ logout: () => {}, busy: false, error: false }}>
          {children}
        </StaffActions.Provider>
      </StaffContext.Provider>
    );
  }
  const session: StaffSession = {
    ...identity.data, staffUserId: identity.data.id, roleName: role.name, permissions: role.permissions,
    memberships: identity.data.memberships.filter(item => item.active),
  };
  return <StaffContext.Provider value={session}>
    <StaffActions.Provider value={{
      logout: () => security.mutation.mutate({ type: "revoke", id: current.id }),
      busy: security.mutation.isPending, error: security.mutation.isError,
    }}>{children}</StaffActions.Provider>
  </StaffContext.Provider>;
}

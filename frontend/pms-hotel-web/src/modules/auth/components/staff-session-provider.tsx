"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoles } from "@/modules/permissions";
import { useSecurity } from "@/modules/security";
import { getPublicEnvironment } from "@/lib/env";
import { mapStaffIdentity } from "../mappers/staff-session.mapper";
import { getStaffIdentityDTO } from "../service/staff-session.service";
import type { StaffSession } from "../model/staff-session";

const StaffContext = createContext<StaffSession | null>(null);
const StaffActions = createContext<{ logout: () => void; busy: boolean; error: boolean } | null>(null);

export function useStaffSession() {
  const value = useContext(StaffContext);
  if (!value) throw new Error("STAFF_SESSION_REQUIRED");
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
  if (!getPublicEnvironment().useMockApi) return <p>La demostración Staff requiere los mocks habilitados.</p>;
  return <StaffMockSession>{children}</StaffMockSession>;
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
  if (queries.some(query => query.isError)) return <section>
    <p role="alert">No se pudo cargar la sesión Staff.</p>
    <button type="button" onClick={() => queries.forEach(query => void query.refetch())}>Reintentar sesión</button>
  </section>;
  if (queries.some(query => query.isPending)) return <p role="status">Cargando sesión Staff…</p>;
  const current = security.query.data?.sessions.find(item => item.current);
  if (current?.status !== "active") return <section>
    <h1>Sesión Staff cerrada</h1>
    <p>Tu sesión de demostración ha terminado.</p>
    <button type="button" disabled={security.mutation.isPending} onClick={() => security.mutation.mutate({ type: "restart" })}>Iniciar demostración Staff</button>
    {security.mutation.isError && <p role="alert">No se pudo iniciar la demostración. Inténtalo nuevamente.</p>}
  </section>;
  const role = roles.query.data?.find(item => item.id === identity.data?.roleId);
  if (!identity.data || !role) return <p role="alert">La sesión no tiene un rol de demostración válido.</p>;
  if (current.id !== identity.data.id) return <p role="alert">La identidad no corresponde a la sesión Staff actual.</p>;
  const session: StaffSession = {
    ...identity.data, roleName: role.name, permissions: role.permissions,
    memberships: identity.data.memberships.filter(item => item.active),
  };
  return <StaffContext.Provider value={session}>
    <StaffActions.Provider value={{
      logout: () => security.mutation.mutate({ type: "revoke", id: current.id }),
      busy: security.mutation.isPending, error: security.mutation.isError,
    }}>{children}</StaffActions.Provider>
  </StaffContext.Provider>;
}

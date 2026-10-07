"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoles } from "@/modules/permissions";
import { useSecurity } from "@/modules/security";
import { getPublicEnvironment } from "@/lib/env";
import { mapStaffIdentity } from "../mappers/staff-session.mapper";
import { getStaffIdentityDTO, logoutStaffSession } from "../service/staff-session.service";
import { staffSessionKey, staffSessionQuery } from "../hooks/staff-session-query";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
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
  return getPublicEnvironment().useMockApi
    ? <StaffMockSession>{children}</StaffMockSession>
    : <StaffBffSession>{children}</StaffBffSession>;
}

function StaffBffSession({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const session = useQuery(staffSessionQuery);
  const logout = useMutation({
    mutationFn: logoutStaffSession,
    onSuccess: async () => {
      setLeaving(true);
      await client.cancelQueries({ queryKey: staffSessionKey });
      client.setQueryData(staffSessionKey, null);
      // Dashboard/calendar caches are Staff-owned; Guest/public queries stay intact.
      for (const key of ["private-09", "reservations", "rooms"]) {
        await client.cancelQueries({ queryKey: [key] });
        client.removeQueries({ queryKey: [key] });
      }
      router.replace("/");
    },
  });
  if (leaving) return <p role="status">Sesión cerrada. Volviendo al inicio…</p>;
  if (!session.data && session.fetchStatus === "paused") return <p role="status">Sin conexión. Esperando para cargar la sesión Staff.</p>;
  if (session.isPending) return <p role="status">Cargando sesión Staff…</p>;
  // Retain the last valid identity during background/network revalidation.
  // Invalid authorization DTOs fail closed, with a load error rather than a false 401.
  if (session.isError && (!session.data || session.error instanceof DomainMappingError)) return <section>
    <p role="alert">No se pudo cargar la sesión Staff.</p>
    <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
  </section>;
  if (!session.data) return <section>
    <h1>Sesión Staff requerida</h1>
    <p>Inicia sesión con tu correo electrónico y contraseña.</p>
    <Link href="/acceso">Iniciar sesión</Link>
    <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
  </section>;
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

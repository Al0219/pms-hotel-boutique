"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { logoutStaffSession } from "../service/staff-session.service";
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
  return <StaffBffSession>{children}</StaffBffSession>;
}

async function clearStaffCaches(client: QueryClient) {
  await client.cancelQueries({ queryKey: staffSessionKey });
  client.setQueryData(staffSessionKey, null);
  // Dashboard/calendar caches are Staff-owned; Guest/public queries stay intact.
  for (const key of ["private-09", "reservations", "rooms", "staff-room-catalog"]) {
    await client.cancelQueries({ queryKey: [key] });
    client.removeQueries({ queryKey: [key] });
  }
}

function StaffBffSession({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const session = useQuery(staffSessionQuery);
  const redirectStarted = useRef(false);
  const signedOut = session.isSuccess && session.data === null && session.fetchStatus === "idle";
  useEffect(() => {
    // Windows share cookies. Revalidate through the BFF when returning to one;
    // cancelRefetch:false coalesces focus with visibility/reconnect revalidation.
    const revalidate = () => { void client.refetchQueries({ queryKey: staffSessionKey, type: "active" }, { cancelRefetch: false }); };
    window.addEventListener("focus", revalidate);
    return () => window.removeEventListener("focus", revalidate);
  }, [client]);
  useEffect(() => {
    if (!signedOut || redirectStarted.current) return;
    redirectStarted.current = true;
    void clearStaffCaches(client).then(() => router.replace("/"));
  }, [signedOut, client, router]);
  const logout = useMutation({
    mutationFn: logoutStaffSession,
    onSuccess: async () => {
      redirectStarted.current = true;
      setLeaving(true);
      await clearStaffCaches(client);
      router.replace("/");
    },
  });
  if (leaving) return <p role="status">Sesión cerrada. Volviendo al inicio…</p>;
  if (!session.data && session.fetchStatus === "paused") return <p role="status">Sin conexión. Esperando para cargar la sesión Staff.</p>;
  if (session.isPending || (session.data === null && session.isFetching)) return <p role="status">Cargando sesión Staff…</p>;
  // Retain the last valid identity during background/network revalidation.
  // Invalid authorization DTOs fail closed, with a load error rather than a false 401.
  if (session.isError && (!session.data || session.error instanceof DomainMappingError)) return <section>
    <p role="alert">No se pudo cargar la sesión Staff.</p>
    <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
  </section>;
  if (!session.data) return <p role="status">Volviendo al inicio…</p>;
  return <StaffContext.Provider value={session.data}>
    <StaffActions.Provider value={{
      logout: () => logout.mutate(), busy: logout.isPending, error: logout.isError,
    }}>{children}</StaffActions.Provider>
  </StaffContext.Provider>;
}

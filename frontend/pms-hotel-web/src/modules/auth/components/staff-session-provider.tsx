"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { logoutStaffSession } from "../service/staff-session.service";
import { staffSessionKey, staffSessionQuery } from "../hooks/staff-session-query";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { StaffSession } from "../model/staff-session";
import { staffPreviewEnabled } from '@/lib/staff-preview';
import { staffPreviewKey, staffPreviewQuery } from '../hooks/staff-preview-query';
import { closeStaffPreview, openStaffPreview } from '../service/staff-preview.service';
import styles from './staff-preview.module.css';
import { clearStaffPendingOperations } from '@/lib/staff-pending-operations';

const StaffContext = createContext<StaffSession | null>(null);
const StaffActions = createContext<{ logout: () => void; busy: boolean; error: boolean } | null>(null);

export function useStaffSession() {
  const value = useContext(StaffContext);
  if (!value) throw new Error("STAFF_SESSION_REQUIRED");
  return value;
}

/** Reuses the existing session query/refresh and signed-out handling. */
export function useRevalidateStaffSession() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: staffSessionKey }), [client]);
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

export function StaffSessionProvider({ children, signedOutRedirect = "/", requireFreshSession = false }: { children: ReactNode; signedOutRedirect?: string; requireFreshSession?: boolean }) {
  return <StaffBffSession preview={staffPreviewEnabled()} signedOutRedirect={signedOutRedirect} requireFreshSession={requireFreshSession}>{children}</StaffBffSession>;
}

async function clearStaffCaches(client: QueryClient, sessionKey: typeof staffSessionKey | typeof staffPreviewKey) {
  clearStaffPendingOperations();
  await client.cancelQueries({ queryKey: ["staff-folio"] });
  client.removeQueries({ queryKey: ["staff-folio"] });
  await client.cancelQueries({ queryKey: sessionKey });
  client.setQueryData(sessionKey, null);
  // Dashboard/calendar caches are Staff-owned; Guest/public queries stay intact.
  for (const key of ["private-09", "reservations", "reports", "rooms", "staff-room-catalog", "staff-reservation-quotes", "staff-room-assignment", "staff-room-occupancy", "staff-housekeeping", "staff-room-service", "staff-amenities", "staff-valet", "staff-stay-journey", "staff-admin"]) {
    await client.cancelQueries({ queryKey: [key] });
    client.removeQueries({ queryKey: [key] });
  }
}

function StaffBffSession({ children, preview, signedOutRedirect, requireFreshSession }: { children: ReactNode; preview: boolean; signedOutRedirect: string; requireFreshSession: boolean }) {
  const client = useQueryClient();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false), [admitted, setAdmitted] = useState(false);
  const sessionKey = preview ? staffPreviewKey : staffSessionKey;
  const session = useQuery({ queryKey: sessionKey,
    queryFn: preview ? staffPreviewQuery.queryFn : staffSessionQuery.queryFn, retry: false });
  useEffect(() => {
    if (admitted || !session.data || !session.isSuccess || session.fetchStatus !== 'idle') return;
    let active = true;
    queueMicrotask(() => { if (active) setAdmitted(true); });
    return () => { active = false; };
  }, [admitted, session.data, session.isSuccess, session.fetchStatus]);
  const reopen = useMutation({ mutationFn: openStaffPreview, onSuccess: () => client.invalidateQueries({ queryKey: staffPreviewKey }) });
  const redirectStarted = useRef(false);
  const signedOut = session.isSuccess && session.data === null && session.fetchStatus === "idle";
  useEffect(() => {
    if (preview) return;
    // Windows share cookies. Revalidate through the BFF when returning to one;
    // cancelRefetch:false coalesces focus with visibility/reconnect revalidation.
    const revalidate = () => { void client.refetchQueries({ queryKey: staffSessionKey, type: "active" }, { cancelRefetch: false }); };
    window.addEventListener("focus", revalidate);
    return () => window.removeEventListener("focus", revalidate);
  }, [client, preview]);
  useEffect(() => {
    if (preview || !signedOut || redirectStarted.current) return;
    redirectStarted.current = true;
    void clearStaffCaches(client, sessionKey).then(() => router.replace(signedOutRedirect));
  }, [signedOut, client, router, preview, sessionKey, signedOutRedirect]);
  const logout = useMutation({
    mutationFn: preview ? closeStaffPreview : logoutStaffSession,
    onSuccess: async () => {
      redirectStarted.current = true;
      setLeaving(true);
      await clearStaffCaches(client, sessionKey);
      router.replace("/");
    },
  });
  if (leaving) return <p role="status">Sesión cerrada. Volviendo al inicio…</p>;
  if (!session.data && session.fetchStatus === "paused") return <p role="status">Sin conexión. Esperando para cargar la sesión Staff.</p>;
  if (session.isPending || (session.data === null && session.isFetching) || (requireFreshSession && !admitted && session.fetchStatus !== "idle")) return <p role="status">Cargando sesión Staff…</p>;
  // Retain the last valid identity during background/network revalidation.
  // Invalid authorization DTOs fail closed, with a load error rather than a false 401.
  if (session.isError && (!session.data || session.error instanceof DomainMappingError)) return <section>
    <p role="alert">No se pudo cargar la sesión Staff.</p>
    <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
  </section>;
  if (!session.data) {
    if (!preview) return <p role="status">Volviendo al inicio…</p>;
    return <section>
      <h1>Vista previa Staff cerrada</h1>
      <p>Este entorno local permite revisar el frontend sin iniciar sesión en Backend.</p>
      <button type="button" disabled={reopen.isPending} onClick={() => reopen.mutate()}>Abrir vista previa Staff</button>
      {reopen.isError && <p role="alert">No se pudo abrir la vista previa. Inténtalo nuevamente.</p>}
      <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
    </section>;
  }
  // Strict screens keep their local state during a background check, but remain
  // hidden/inert until it succeeds. Definitive logout/identity failure above still unmounts.
  const checking = requireFreshSession && session.fetchStatus !== 'idle';
  const unavailable = requireFreshSession && session.isError;
  return <StaffContext.Provider value={session.data}>
    <StaffActions.Provider value={{
      logout: () => logout.mutate(), busy: logout.isPending, error: logout.isError,
    }}>{checking && <p role="status">Cargando sesión Staff…</p>}
      {unavailable && !checking && <section><p role="alert">No se pudo cargar la sesión Staff.</p><button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button></section>}
      {preview && <div className={styles.notice} role="status"><strong>Vista previa Staff</strong>
      Datos ficticios del frontend · Sin Backend, cuentas ni pagos reales.</div>}
      {requireFreshSession ? <div data-staff-session-blocked={checking || unavailable ? 'true' : undefined} hidden={checking || unavailable} inert={checking || unavailable}>{children}</div> : children}
    </StaffActions.Provider>
  </StaffContext.Provider>;
}

"use client";

import Link from "next/link";
import { useGuestSession } from "./guest-session-provider";
import { GuestSessionCheck } from "./guest-session-check";
import { guestAccessReturn } from "../model/checkout-return";
import styles from "./guest-access-page.module.css";
import sessionStyles from "./guest-account-gate.module.css";

export function GuestAccountGate({ children, returnTo }: Readonly<{ children: React.ReactNode; returnTo?: string }>) {
  const { account, signOut, status, isPending, error } = useGuestSession();
  const destination = guestAccessReturn(returnTo);
  if (status === "checking" || status === "error") return <GuestSessionCheck />;
  if (!account) {
    return <section className={styles.page}>
      <div className={styles.content}>
        <h1>Accede a tu cuenta</h1>
        <p>Inicia sesión para consultar tu cuenta. Puedes seguir reservando como invitado.</p>
        <Link className={styles.primary} href={destination ? `/acceso?returnTo=${encodeURIComponent(destination)}` : '/acceso'}>Iniciar sesión</Link>
        <Link className={styles.secondary} href="/">Continuar como invitado</Link>
      </div>
    </section>;
  }
  return <>
    <div className={sessionStyles.sessionBar} aria-label="Sesión de huésped">
      <span>{account.email ?? "Cuenta de huésped"}</span>
      <button className={sessionStyles.signOut} type="button" disabled={isPending} onClick={() => void signOut()}>{isPending ? "Cerrando sesión…" : "Cerrar sesión"}</button>
      {error && <p role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
    </div>
    {children}
  </>;
}

"use client";

import Link from "next/link";
import { useGuestSession } from "./guest-session-provider";
import styles from "./guest-access-page.module.css";

export function GuestAccountGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const { account, signOut } = useGuestSession();
  if (!account) {
    return <section className={styles.page}>
      <div className={styles.content}>
        <h1>Accede a tu cuenta</h1>
        <p>Inicia sesión para consultar tu cuenta. Puedes seguir reservando como invitado.</p>
        <Link className={styles.primary} href="/acceso">Iniciar sesión</Link>
        <Link className={styles.secondary} href="/">Continuar como invitado</Link>
      </div>
    </section>;
  }
  return <>
    <div className={styles.sessionBar} aria-label="Sesión de huésped">
      <span>{account.email ?? "Cuenta de huésped"}</span>
      <button className={styles.back} type="button" onClick={signOut}>Cerrar sesión</button>
    </div>
    {children}
  </>;
}

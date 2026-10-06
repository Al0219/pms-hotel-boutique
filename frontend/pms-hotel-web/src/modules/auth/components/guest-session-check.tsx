"use client";

import { useGuestSession } from "./guest-session-provider";
import styles from "./guest-access-page.module.css";

export function GuestSessionCheck() {
  const { status, retrySession } = useGuestSession();
  return <section className={styles.page} aria-busy={status === "checking"}>
    <div className={styles.content}>
      {status === "checking" ? <p role="status">Comprobando tu sesión…</p> : <>
        <p role="alert">No pudimos comprobar tu sesión. Comprueba tu conexión y vuelve a intentarlo.</p>
        <button className={styles.primary} type="button" onClick={retrySession}>Reintentar sesión</button>
      </>}
    </div>
  </section>;
}

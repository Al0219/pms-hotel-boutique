"use client";

import { useState } from "react";
import Link from "next/link";
import { HttpNetworkError } from "@/lib/http/errors";
import { useGuestSession } from "./guest-session-provider";
import styles from "./guest-access-page.module.css";

type AccessStep = "options" | "email" | "google";

export function GuestAccessPage() {
  const [step, setStep] = useState<AccessStep>("options");
  const [email, setEmail] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const { account, signIn, signOut, isPending, error, resetError } = useGuestSession();

  function changeStep(next: AccessStep) {
    resetError();
    setShowHelp(false);
    setStep(next);
  }

  if (account) {
    return <section className={styles.page} aria-labelledby="access-success-title">
      <div className={styles.content}>
        <p className={styles.eyebrow} role="status">ACCESO COMPLETADO</p>
        <h1 id="access-success-title">Tu cuenta está lista</h1>
        <p>La sesión de demostración está iniciada. Puedes consultar tu cuenta o continuar reservando.</p>
        <div className={styles.card}>
          <p>{account.email ?? "Cuenta de huésped"}</p>
          <p>Método de acceso <strong>{account.externalIdentities.some(identity => identity.provider === "GOOGLE") ? "Google" : "Correo electrónico"}</strong></p>
        </div>
        <Link className={styles.primary} href="/cuenta">Ir a mi cuenta</Link>
        <Link className={styles.secondary} href="/">Continuar reservando</Link>
        <button className={styles.secondary} type="button" onClick={signOut}>Cerrar sesión</button>
      </div>
    </section>;
  }

  const errorMessage = error instanceof HttpNetworkError
    ? "No pudimos conectar. Comprueba tu conexión y vuelve a intentarlo."
    : "No pudimos completar el acceso. Revisa los datos o vuelve a intentarlo.";

  return <section className={styles.page} aria-labelledby="access-title" aria-busy={isPending}>
    {step === "options"
      ? <Link className={styles.back} href="/">← Volver al inicio</Link>
      : <button className={styles.back} disabled={isPending} onClick={() => changeStep("options")} type="button">← Volver a opciones</button>}
    <div className={styles.content}>
      <h1 id="access-title">{step === "email" ? "Accede con tu correo" : step === "google" ? "Continuar con Google" : "Accede a tu cuenta"}</h1>
      <p>Consulta tus reservas, beneficios y preferencias. También puedes reservar sin crear una cuenta.</p>
      <p>Acceso de demostración: no se envían correos ni se conecta con Google.</p>
      {step === "options" ? <div className={styles.card}>
        <h2>Elige cómo continuar</h2>
        <button className={styles.google} onClick={() => changeStep("google")} type="button"><span aria-hidden="true">G</span>Continuar con Google</button>
        <button className={styles.primary} onClick={() => changeStep("email")} type="button">Continuar con correo</button>
        <Link className={styles.secondary} href="/">Continuar como invitado</Link>
      </div> : step === "email" ? <form className={styles.card} onSubmit={event => {
        event.preventDefault();
        if (!email.trim()) return;
        void signIn({ method: "EMAIL", email: email.trim() });
      }}>
        <label htmlFor="guest-email">Correo electrónico</label>
        <input autoComplete="email" id="guest-email" disabled={isPending} onChange={event => { setEmail(event.target.value); resetError(); }} required type="email" value={email} aria-describedby={error ? "access-error" : undefined} />
        <button className={styles.recovery} onClick={() => setShowHelp(!showHelp)} type="button" aria-expanded={showHelp} aria-controls="access-help">¿Problemas para acceder?</button>
        {showHelp && <p id="access-help">Revisa el correo e intenta de nuevo. También puedes volver a opciones y continuar como invitado.</p>}
        <button className={styles.primary} disabled={isPending} type="submit">{isPending ? "Accediendo…" : "Acceder con correo"}</button>
      </form> : <div className={styles.card}>
        <p>Continúa con la cuenta Google de demostración. Este método es opcional.</p>
        <button className={styles.primary} disabled={isPending} onClick={() => void signIn({ method: "GOOGLE" })} type="button">{isPending ? "Accediendo…" : "Continuar retorno al PMS"}</button>
      </div>}
      {isPending && <p className={styles.status} role="status">Verificando acceso…</p>}
      {error && <p id="access-error" className={styles.status} role="alert">{errorMessage}</p>}
    </div>
  </section>;
}

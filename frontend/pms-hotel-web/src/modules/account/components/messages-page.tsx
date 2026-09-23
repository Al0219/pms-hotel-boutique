"use client";

import Link from "next/link";
import styles from "./messages-page.module.css";

const MESSAGES = [
  {
    id: "MSG-01",
    sender: "Recepción Hotel Boutique",
    time: "Ayer 14:30",
    text: "Estimado Alan, confirmamos la preparación de su habitación con preferencia de piso alto y cama King.",
  },
];

export function MessagesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Hotel Boutique
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/habitaciones">Habitaciones</Link>
          <Link href="/amenidades">Amenidades</Link>
          <Link href="/mis-reservas">Mis reservas</Link>
          <Link className={styles.activeNav} href="/cuenta">
            Mi cuenta
          </Link>
        </nav>
      </header>

      <div className={styles.container}>
        <Link className={styles.backLink} href="/cuenta">
          ← Mi cuenta
        </Link>

        <p className={styles.eyebrow}>COMUNICACIÓN</p>
        <h1 className={styles.title}>Mensajes de la estancia</h1>
        <p className={styles.subtitle}>
          Canal directo de conversación entre tu cuenta de huésped y el personal de Recepción.
        </p>

        <section aria-label="Centro de mensajes" className={styles.box}>
          {MESSAGES.map((m) => (
            <div className={styles.msgItem} key={m.id}>
              <div className={styles.msgHeader}>
                <span className={styles.msgSender}>{m.sender}</span>
                <span className={styles.msgTime}>{m.time}</span>
              </div>
              <p className={styles.msgText}>{m.text}</p>
            </div>
          ))}
        </section>

        <span className={styles.note}>
          La conversación de una reserva activa se centraliza aquí y continuará disponible durante tu estadía en la app
          móvil Android.
        </span>
      </div>
    </main>
  );
}

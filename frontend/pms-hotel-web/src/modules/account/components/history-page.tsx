"use client";

import Link from "next/link";
import styles from "./history-page.module.css";

const HISTORY_ITEMS = [
  {
    code: "HB-2026-07214",
    title: "Deluxe King · 2 noches",
    details: "14–16 jul 2026 · Alan Palacios · Stay ST-07214-01 · check-out completado",
    price: "Q 2,180",
    status: "COMPLETADA",
  },
  {
    code: "HB-2026-08103",
    title: "Superior · 2 noches",
    details: "03–05 jun 2026 · Alan Palacios · Stay ST-06103-01 · check-out completado",
    price: "Q 1,760",
    status: "COMPLETADA",
  },
];

export function HistoryPage() {
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

        <p className={styles.eyebrow}>RESERVAS COMPLETADAS</p>
        <h1 className={styles.title}>Historial de estadías</h1>
        <p className={styles.subtitle}>
          Consulta únicamente estadías completadas vinculadas a esta cuenta Guest. Reservas de otros
          huéspedes, empresas o terceros no aparecen en tu historial.
        </p>

        <section aria-label="Listado de estadías completadas" className={styles.list}>
          {HISTORY_ITEMS.map((item) => (
            <article className={styles.card} key={item.code}>
              <div className={styles.cardLeft}>
                <span className={styles.code}>{item.code}</span>
                <h2 className={styles.roomTitle}>{item.title}</h2>
                <p className={styles.details}>{item.details}</p>
                <span className={styles.badgeCompleted}>{item.status}</span>
              </div>
              <div className={styles.cardRight}>
                <p className={styles.price}>{item.price}</p>
              </div>
            </article>
          ))}
        </section>

        <span className={styles.note}>
          Privacidad: historial filtrado por GuestAccount + ReservationGuest/occupant vinculado. Solo estadías
          propias completadas; reservas de terceros quedan excluidas.
        </span>
      </div>
    </main>
  );
}

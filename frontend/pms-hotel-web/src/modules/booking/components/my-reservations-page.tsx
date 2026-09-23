"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./my-reservations-page.module.css";

const UPCOMING_RESERVATIONS = [
  {
    code: "HB-2026-08421",
    title: "Deluxe King",
    dates: "28–31 agosto 2026 · 2 huéspedes",
    price: "US$ 505",
    status: "Confirmada",
  },
  {
    code: "HB-2026-09106",
    title: "Suite Terraza",
    dates: "12–15 septiembre 2026 · 2 huéspedes",
    price: "US$ 610",
    status: "Confirmada",
  },
];

export function MyReservationsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Hotel Boutique
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/habitaciones">Habitaciones</Link>
          <Link href="/amenidades">Amenidades</Link>
          <Link className={styles.activeNav} href="/mis-reservas">
            Mis reservas
          </Link>
          <Link href="/cuenta">Mi cuenta</Link>
        </nav>
      </header>

      <div className={styles.container}>
        <h1 className={styles.title}>Mis reservas</h1>
        <p className={styles.subtitle}>Consulta tus próximas estadías y revisa sus detalles.</p>

        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${tab === "upcoming" ? styles.tabActive : ""}`}
            onClick={() => setTab("upcoming")}
            type="button"
          >
            Próximas 2
          </button>
          <button
            className={`${styles.tab} ${tab === "past" ? styles.tabActive : ""}`}
            onClick={() => setTab("past")}
            type="button"
          >
            Anteriores
          </button>
        </div>

        {tab === "upcoming" ? (
          <section aria-label="Próximas reservas" className={styles.grid}>
            {UPCOMING_RESERVATIONS.map((r) => (
              <article className={styles.card} key={r.code}>
                <div className={styles.cardThumb} />
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <span className={styles.code}>{r.code}</span>
                    <h2 className={styles.roomTitle}>{r.title}</h2>
                    <p className={styles.details}>{r.dates}</p>
                    <span className={styles.badgeConfirmed}>{r.status}</span>
                  </div>
                  <div className={styles.cardRight}>
                    <p className={styles.price}>{r.price}</p>
                    <Link className={styles.btnDetails} href={`/cuenta`}>
                      Ver detalles
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={styles.grid}>
            <p className={styles.subtitle}>
              Para consultar tus estadías pasadas completadas, puedes ir a tu{" "}
              <Link href="/cuenta/historial">Historial de estadías</Link>.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

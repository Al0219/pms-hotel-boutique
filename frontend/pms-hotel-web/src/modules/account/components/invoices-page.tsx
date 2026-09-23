"use client";

import Link from "next/link";
import styles from "./invoices-page.module.css";

const INVOICES = [
  {
    id: "FACT-2026-07214",
    stay: "Deluxe King · 14–16 jul 2026",
    amount: "Q 2,180.00",
    date: "16 jul 2026",
  },
  {
    id: "FACT-2026-06103",
    stay: "Superior · 03–05 jun 2026",
    amount: "Q 1,760.00",
    date: "05 jun 2026",
  },
];

export function InvoicesPage() {
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

        <p className={styles.eyebrow}>COMPROBANTES Y FACTURACIÓN</p>
        <h1 className={styles.title}>Facturas disponibles</h1>
        <p className={styles.subtitle}>
          Consulta y descarga tus comprobantes de pago asociados a estadías completadas en Hotel Boutique.
        </p>

        <section aria-label="Listado de facturas" className={styles.list}>
          {INVOICES.map((inv) => (
            <article className={styles.invoiceCard} key={inv.id}>
              <div>
                <h2>{inv.id}</h2>
                <p>
                  {inv.stay} · Total: <strong>{inv.amount}</strong> ({inv.date})
                </p>
              </div>
              <button className={styles.downloadBtn} onClick={() => alert(`Descargando ${inv.id}`)} type="button">
                Descargar PDF
              </button>
            </article>
          ))}
        </section>

        <span className={styles.note}>
          Los comprobantes fiscales aparecerán únicamente después de que se complete el check-out de la estancia o
          transacción correspondiente.
        </span>
      </div>
    </main>
  );
}

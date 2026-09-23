"use client";

import Link from "next/link";
import styles from "./promotions-page.module.css";

const PROMOTIONS = [
  {
    code: "MEMBER5",
    title: "Member Rate -5%",
    badge: "OFERTA ELEGIBLE · SILVER",
    description: "Descuento del 5% automático aplicable en reservas de canales directos.",
    conditions: "Disponible para tu cuenta Silver · sujeto a fechas, Rate Plan y disponibilidad.",
  },
  {
    code: "LONGSTAY15",
    title: "Estancia Larga · 15% Descuento",
    badge: "OFERTA TEMPORADA",
    description: "Reserva 4 o más noches consecutivas y obtén un 15% de descuento en el total de tu estadía.",
    conditions: "Aplica para reservaciones realizadas con 7 días de anticipación.",
  },
];

export function PromotionsPage() {
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

        <p className={styles.eyebrow}>OFERTAS Y TARIFAS ESPECIALES</p>
        <h1 className={styles.title}>Promociones Disponibles</h1>
        <p className={styles.subtitle}>
          Revisa las ofertas activas para tu cuenta y aplícalas directamente al momento de buscar tus fechas y
          habitaciones.
        </p>

        <section aria-label="Listado de promociones" className={styles.grid}>
          {PROMOTIONS.map((p) => (
            <article className={styles.promoCard} key={p.code}>
              <div className={styles.promoLeft}>
                <span className={styles.promoBadge}>{p.badge}</span>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <p className={styles.conditions}>{p.conditions}</p>
              </div>
              <div>
                <Link className={styles.applyBtn} href="/habitaciones">
                  Reservar con oferta
                </Link>
              </div>
            </article>
          ))}
        </section>

        <span className={styles.note}>
          Las ofertas dependen de las fechas seleccionadas, el plan tarifario (Rate Plan) y la disponibilidad
          física del hotel. Si una promoción no aplica en tu fecha deseada, el sistema indicará el motivo.
        </span>
      </div>
    </main>
  );
}

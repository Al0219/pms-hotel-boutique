"use client";

import Link from "next/link";
import styles from "./rewards-page.module.css";

const BENEFITS = [
  {
    title: "Late Check-out Preferencial",
    description: "Extensión de salida hasta la 1:00 PM sin costo adicional (sujeto a disponibilidad).",
  },
  {
    title: "Descuento Exclusivo Member Rate",
    description: "Tarifa reducida del 5% en reservas directas en la web pública.",
  },
  {
    title: "Amenidad de Bienvenida",
    description: "Detalle especial de cortesía en tu habitación al momento del check-in.",
  },
];

export function RewardsPage() {
  const currentNights = 3;
  const targetNights = 8;
  const progressPercent = (currentNights / targetNights) * 100;

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

        <p className={styles.eyebrow}>PROGRAMA DE FIDELIDAD</p>
        <h1 className={styles.title}>Rewards y Beneficios</h1>
        <p className={styles.subtitle}>
          Consulta tu progreso de estadías, tu nivel de membresía actual y los beneficios activos de los que
          disfrutas en Hotel Boutique.
        </p>

        <section className={styles.tierCard}>
          <div className={styles.tierHeader}>
            <div>
              <span className={styles.tierBadge}>Silver Member</span>
            </div>
            <span className={styles.progressLabel}>
              {currentNights} / {targetNights} noches para nivel <strong>Gold</strong>
            </span>
          </div>

          <div className={styles.progressBarBg}>
            <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
          </div>

          <span className={styles.progressText}>
            Te faltan <strong>5 noches completadas</strong> para alcanzar el nivel Gold y desbloquear upgrades de
            habitación de cortesía.
          </span>
        </section>

        <h2 className={styles.benefitsTitle}>3 Beneficios Activos</h2>
        <section aria-label="Beneficios activos" className={styles.grid}>
          {BENEFITS.map((b) => (
            <article className={styles.benefitCard} key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.description}</p>
            </article>
          ))}
        </section>

        <span className={styles.note}>
          Condiciones: los beneficios se activan automáticamente para reservas directas de la cuenta Guest.
          No aplican para reservas de agencias de terceros (OTAs).
        </span>
      </div>
    </main>
  );
}

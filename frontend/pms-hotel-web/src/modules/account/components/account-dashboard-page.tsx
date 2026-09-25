"use client";

import Link from "next/link";
import { useGuestSession } from "@/modules/auth";
import { useAccountSummary } from "../hooks/use-account-summary";
import styles from "./account-dashboard-page.module.css";

export function AccountDashboardPage() {
  const { account } = useGuestSession();
  const { data: summary, isPending, error, refetch } = useAccountSummary();
  if (!account) return null;
  if (isPending) return <section className={styles.page} role="status">Cargando tu cuenta…</section>;
  if (error || !summary) return <section className={styles.page}>
    <p role="alert">No se pudo cargar tu cuenta.</p>
    <button className={styles.btnPrimary} type="button" onClick={() => void refetch()}>Reintentar</button>
  </section>;

  const cards = [
    { href: "/cuenta/reservas", category: "PRÓXIMAS RESERVAS", title: summary.upcomingStay ? "Próxima estancia" : "No tienes próximas estadías", description: summary.upcomingStay ? `${summary.upcomingStay.reservationCode} · ${summary.upcomingStay.roomsCount} habitaciones · ${summary.upcomingStay.datesLabel}. ${summary.upcomingStay.summaryText}` : "Cuando reserves, tus próximas estancias aparecerán aquí." },
    { href: "/cuenta/perfil", category: "PERFIL Y PREFERENCIAS", title: `${summary.profile.name} · ${summary.profile.preferredLanguage}`, description: summary.profile.description },
    { href: "/cuenta/facturas", category: "FACTURAS", title: `${summary.invoices.availableDocumentsCount} documentos disponibles`, description: summary.invoices.description },
    { href: "/cuenta/rewards", category: "REWARDS", title: `${summary.rewards.tierName} · ${summary.rewards.currentNights}/${summary.rewards.targetNights} hacia ${summary.rewards.nextTierName}`, description: `${summary.rewards.activeBenefitsCount} beneficios activos · ${summary.rewards.description}` },
    { href: "/cuenta/perfil#preferencias", category: "CONFIGURACIÓN", title: "Preferencias de estancia", description: "Configura idioma y preferencias de tu perfil." },
    { href: "/cuenta/promociones", category: "PROMOCIONES", title: summary.promotions.eligibleOffersCount ? `${summary.promotions.eligibleOffersCount} ofertas elegibles · ${summary.promotions.featuredOfferTitle}` : "Sin ofertas elegibles", description: summary.promotions.description },
  ];

  return <section className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/">Hotel Boutique</Link>
      <nav aria-label="Navegación principal">
        <Link href="/">Buscar disponibilidad</Link>
        <Link href="/cuenta/reservas">Mis reservas</Link>
        <Link className={styles.activeNav} href="/cuenta">Mi cuenta</Link>
      </nav>
    </header>
    <div className={styles.container}>
      <section className={styles.intro}>
        <div className={styles.introContent}>
          <h1>Mi cuenta</h1>
          <p>Hola, {summary.guestName}. Consulta tus reservas, facturas, rewards y promociones desde un solo lugar.</p>
          <span className={styles.statusTag}>
            {summary.isActive ? "Cuenta activa" : "Cuenta inactiva"} · {account.externalIdentities.some(identity => identity.provider === "GOOGLE") ? "Google conectado" : "Acceso por correo"} · {account.email} · {summary.linkedReservationsCount} reservas vinculadas
          </span>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btnPrimary} href="/cuenta/reservas">Historial</Link>
          <Link className={styles.btnSecondary} href="/">Buscar disponibilidad</Link>
        </div>
      </section>
      <section aria-label="Resumen de cuenta" className={styles.grid}>
        {cards.map(card => <Link className={styles.card} href={card.href} key={card.href}>
          <div><p className={styles.cardCategory}>{card.category}</p><h2 className={styles.cardTitle}>{card.title}</h2><p className={styles.cardDesc}>{card.description}</p></div>
        </Link>)}
      </section>
      <p className={styles.note}>La cuenta es opcional para reservar. La identidad de acceso y el perfil del huésped se mantienen separados.</p>
    </div>
  </section>;
}

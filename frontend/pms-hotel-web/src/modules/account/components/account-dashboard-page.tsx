"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./account-dashboard-page.module.css";

export function AccountDashboardPage() {
  // Toggle between active account with 1 stay (Captura 191401) and empty account (Captura 191326)
  const [hasReservations, setHasReservations] = useState(true);

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
        {/* Toggle para pruebas / demostración de estado activo vs estado vacío */}
        <div className={styles.modeToggleBar}>
          <span className={styles.toggleLabel}>Demostración de vista:</span>
          <button
            className={styles.toggleButton}
            onClick={() => setHasReservations(!hasReservations)}
            type="button"
          >
            {hasReservations ? "Ver Estado Vacío (0 reservas)" : "Ver Estado Activo (1 reserva)"}
          </button>
        </div>

        <section className={styles.intro}>
          <div className={styles.introContent}>
            <h1>Mi cuenta</h1>
            {hasReservations ? (
              <>
                <p>
                  Hola, Alan Palacios. Consulta tus próximas reservas, facturas, rewards, mensajes y
                  promociones desde un solo lugar.
                </p>
                <span className={styles.statusTag}>
                  Cuenta activa · Google conectado · alan@email.com · 1 reserva vinculada
                </span>
              </>
            ) : (
              <>
                <p>
                  Tu cuenta está lista. Aún no tienes reservas vinculadas; busca disponibilidad para
                  comenzar una nueva estancia.
                </p>
                <span className={styles.statusTag}>
                  Cuenta activa · 0 reservas vinculadas · sin actividad de estadía todavía
                </span>
              </>
            )}
          </div>
          <div className={styles.actions}>
            {hasReservations ? (
              <>
                <Link className={styles.btnPrimary} href="/cuenta/historial">
                  Historial
                </Link>
                <Link className={styles.btnSecondary} href="/habitaciones">
                  Reservar otra estancia
                </Link>
              </>
            ) : (
              <Link className={styles.btnPrimary} href="/habitaciones">
                Buscar disponibilidad
              </Link>
            )}
          </div>
        </section>

        <section aria-label="Resumen de cuenta" className={styles.grid}>
          {/* Card 1: Próximas Reservas */}
          <Link className={styles.card} href="/mis-reservas">
            <div>
              <p className={styles.cardCategory}>
                {hasReservations ? "PRÓXIMAS RESERVAS" : "SIN RESERVAS"}
              </p>
              <h2 className={styles.cardTitle}>
                {hasReservations ? "1 próxima estancia" : "No tienes próximas estadías"}
              </h2>
              <p className={styles.cardDesc}>
                {hasReservations
                  ? "HB-2026-09117 · 2 habitaciones · 12–15 sep. Consulta el detalle y huéspedes asignados."
                  : "Cuando reserves, tus próximas estancias aparecerán aquí. No mostramos códigos, fechas ni habitaciones que no existan."}
              </p>
            </div>
          </Link>

          {/* Card 2: Perfil y Preferencias */}
          <Link className={styles.card} href="/cuenta/perfil">
            <div>
              <p className={styles.cardCategory}>PERFIL Y PREFERENCIAS</p>
              <h2 className={styles.cardTitle}>
                {hasReservations ? "Alan Palacios · Español" : "Perfil disponible"}
              </h2>
              <p className={styles.cardDesc}>
                {hasReservations
                  ? "Datos personales, privacidad y preferencias de estancia editables con validación."
                  : "Puedes completar o editar tus datos y preferencias aunque todavía no tengas una reserva."}
              </p>
            </div>
          </Link>

          {/* Card 3: Facturas */}
          <Link className={styles.card} href="/cuenta/facturas">
            <div>
              <p className={styles.cardCategory}>FACTURAS</p>
              <h2 className={styles.cardTitle}>
                {hasReservations ? "2 documentos disponibles" : "Sin documentos"}
              </h2>
              <p className={styles.cardDesc}>
                {hasReservations
                  ? "Consulta comprobantes asociados a tus estadías; el formato fiscal depende de la propiedad y país."
                  : "Los comprobantes aparecerán únicamente después de una estadía o transacción propia que genere un documento."}
              </p>
            </div>
          </Link>

          {/* Card 4: Rewards */}
          <Link className={styles.card} href="/cuenta/rewards">
            <div>
              <p className={styles.cardCategory}>REWARDS</p>
              <h2 className={styles.cardTitle}>
                {hasReservations ? "Silver · 3/8 hacia Gold" : "Sin actividad elegible"}
              </h2>
              <p className={styles.cardDesc}>
                {hasReservations
                  ? "3 beneficios activos · consulta progreso, condiciones y próximos hitos."
                  : "Aún no hay estadías, noches, gasto ni beneficios que mostrar para esta cuenta."}
              </p>
            </div>
          </Link>

          {/* Card 5: Mensajes */}
          <Link className={styles.card} href="/cuenta/mensajes">
            <div>
              <p className={styles.cardCategory}>MENSAJES</p>
              <h2 className={styles.cardTitle}>
                {hasReservations ? "0 mensajes sin leer" : "Sin conversaciones"}
              </h2>
              <p className={styles.cardDesc}>
                {hasReservations
                  ? "La comunicación huésped ↔ hotel se centraliza en Recepción y continúa en la app durante la estadía."
                  : "No hay conversaciones de reserva activas. Recepción aparecerá aquí cuando exista una estadía vinculada."}
              </p>
            </div>
          </Link>

          {/* Card 6: Promociones */}
          <Link className={styles.card} href="/cuenta/promociones">
            <div>
              <p className={styles.cardCategory}>PROMOCIONES</p>
              <h2 className={styles.cardTitle}>
                {hasReservations
                  ? "1 oferta elegible · Member Rate -5%"
                  : "Sin ofertas aplicadas"}
              </h2>
              <p className={styles.cardDesc}>
                {hasReservations
                  ? "Disponible para tu cuenta Silver en canales directos · sujeto a fechas, Rate Plan y disponibilidad."
                  : "Las ofertas aplicables se mostrarán cuando exista contexto de fechas, Rate Plan y disponibilidad."}
              </p>
            </div>
          </Link>
        </section>

        <span className={styles.note}>
          {hasReservations
            ? "La cuenta es opcional para reservar. Historial y preferencias pertenecen al perfil Guest; el método de acceso puede cambiar sin perderlos."
            : "Estado vacío real: 0 reservas vinculadas. No se inventan reservas, facturas, mensajes, rewards ni promociones. Puedes buscar disponibilidad cuando quieras."}
        </span>
      </div>
    </main>
  );
}

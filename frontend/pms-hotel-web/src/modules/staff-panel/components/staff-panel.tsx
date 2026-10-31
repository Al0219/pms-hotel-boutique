"use client";

import Link from 'next/link';
import { useReservationCenter } from '@/modules/reservations';
import { useRooms } from '@/modules/rooms';
import { SvgIcon } from '@/shared/components/svg-icon';
import { StaffPanelOverview } from './staff-panel-overview';
import styles from './staff-panel.module.css';

const shortcuts = [
  { href: '/reservas', icon: 'reservations', title: 'Reservas', text: 'Consulta huéspedes, asigna habitaciones y gestiona cada estadía.', action: 'Ver reservas' },
  { href: '/staff/habitaciones', icon: 'room', title: 'Habitaciones', text: 'Revisa el inventario y el estado de las habitaciones del hotel.', action: 'Ver habitaciones' },
  { href: '/calendario', icon: 'calendar', title: 'Calendario', text: 'Organiza llegadas, salidas y asignaciones en una sola vista.', action: 'Abrir calendario' },
] as const;

export function StaffPanel({ propertyId, sessionId, propertyName }: {
  propertyId: string; sessionId: string; propertyName: string;
}) {
  const reservations = useReservationCenter(propertyId, '/api/staff/reservations', sessionId);
  const rooms = useRooms(propertyId, '/api/staff/rooms', sessionId);
  const loading = reservations.isFetching || rooms.isFetching;
  const failed = reservations.isError || rooms.isError;
  const available = !loading && !failed && reservations.isSuccess && rooms.isSuccess;
  function refresh() { void reservations.refetch(); void rooms.refetch(); }

  return <section className={styles.page}>
    <header className={styles.hero}>
      <div>
        <p className={styles.overline}>HOTEL BOUTIQUE · STAFF</p>
        <h1>Panel de recepción</h1>
        <p className={styles.heroDescription}>Una mirada a tu hotel, un mejor inicio para cada estadía.</p>
        <span className={styles.property}><SvgIcon name="location" />{propertyName}</span>
      </div>
      <div className={styles.heroActions}>
        <button className={styles.refresh} onClick={refresh} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar datos'}
        </button>
        <Link className={styles.primaryAction} href="/reservas">Gestionar reservas <SvgIcon name="arrow" /></Link>
      </div>
    </header>
    {loading ? <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />Cargando datos de la propiedad…
    </div> : failed ? <div className={styles.error} role="alert">
      <strong>No se pudieron consultar los datos del panel.</strong>
      <p>Intenta actualizar para recuperar la información de tu hotel.</p>
      <button className={styles.secondaryAction} onClick={refresh}>Reintentar</button>
    </div> : available ? <StaffPanelOverview reservations={reservations.data.reservations} rooms={rooms.data} />
      : <p role="status">Preparando datos del panel…</p>}
    <section aria-labelledby="panel-shortcuts" className={styles.shortcutSection}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>TU ESPACIO DE TRABAJO</p><h2 id="panel-shortcuts">¿Por dónde empezamos?</h2></div></div>
      <nav className={styles.cards} aria-label="Accesos del panel">
        {shortcuts.map(item => <Link key={item.href} className={styles.card} href={item.href}>
          <span className={styles.icon}><SvgIcon name={item.icon} /></span>
          <h3>{item.title}</h3><p>{item.text}</p><span className={styles.action}>{item.action} <SvgIcon name="arrow" /></span>
        </Link>)}
      </nav>
    </section>
  </section>;
}

// Panel de control operativo Staff

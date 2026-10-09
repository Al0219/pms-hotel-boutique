"use client";

import Link from 'next/link';
import { useReservationCenter } from '@/modules/reservations';
import { useRooms } from '@/modules/rooms';
import styles from './staff-panel.module.css';

export function StaffPanel({ propertyId, sessionId }: {
  propertyId: string; sessionId: string; propertyName: string;
}) {
  const reservations = useReservationCenter(propertyId, '/api/staff/reservations', sessionId);
  const rooms = useRooms(propertyId, '/api/staff/rooms', sessionId);
  const loading = reservations.isFetching || rooms.isFetching;
  const failed = reservations.isError || rooms.isError;
  const available = !loading && !failed && reservations.isSuccess && rooms.isSuccess;
  return <section className={styles.page}>
    <header><p className={styles.overline}>HOTEL BOUTIQUE · STAFF</p><h1>Panel de recepción</h1></header>
    {loading ? <p role="status">Cargando datos de la propiedad…</p> : failed ? <div role="alert">
      <p>No se pudieron consultar los datos del panel.</p>
      <button onClick={() => { void reservations.refetch(); void rooms.refetch(); }}>Reintentar</button>
    </div> : available ? <>
      <dl className={styles.metrics} aria-label="Resumen de la propiedad">
        <div><dt>Reservas registradas</dt><dd>{reservations.data.reservations.length}</dd></div>
        <div><dt>Estadías registradas</dt><dd>{reservations.data.reservations.reduce((total, item) => total + (item.roomCount ?? 0), 0)}</dd></div>
        <div><dt>Habitaciones físicas</dt><dd>{rooms.data.length}</dd></div>
      </dl>
      {reservations.data.reservations.length === 0 && <p>No hay reservas registradas en esta propiedad.</p>}
      {rooms.data.length === 0 && <p>No hay habitaciones físicas registradas en esta propiedad.</p>}
    </> : <p role="status">Preparando datos del panel…</p>}
    <nav className={styles.cards} aria-label="Accesos del panel">
      <Link className={styles.card} href="/reservas"><h2>Reservas</h2><p>Busca por código o huésped y revisa los detalles de cada estadía.</p><span className={styles.action}>Ver reservas →</span></Link>
      <Link className={styles.card} href="/staff/habitaciones"><h2>Habitaciones</h2><p>Consulta las habitaciones físicas y sus tipos.</p><span className={styles.action}>Ver habitaciones →</span></Link>
      <Link className={styles.card} href="/calendario"><h2>Calendario</h2><p>Consulta las fechas de llegada y salida para organizar la recepción.</p><span className={styles.action}>Abrir calendario →</span></Link>
    </nav>
  </section>;
}

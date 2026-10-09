"use client";

import { useState, type ReactNode } from "react";
import Link from 'next/link';

import { HttpNetworkError } from "@/lib/http/errors";
import { EntityDataGrid, StatusBadge, EntityListSurface, EntityPagination, useEntityPagination, EntityFilterField, ENTITY_LIST_TABLE_MIN_WIDTH } from "@/shared/components";

import { useRooms } from "../hooks/use-rooms";
import { useRoomOccupancy } from '../hooks/use-room-occupancy';
import { hotelOccupancyDay, isOccupancyDay, type RoomOccupancyState, type RoomOccupancySource, type RoomOccupancyStay } from '../model/room-occupancy';
import { OCCUPANCY_LABELS, OCCUPANCY_VARIANTS } from './room-occupancy-labels';
import { ROOM_STATUS_LABELS } from "./room-status-labels";
import { RoomStatusPanel } from "./room-status-panel";
import styles from "./room-board.module.css";
import workspace from "@/shared/components/entity-workspace.module.css";
import { StaffInventoryCell } from "./staff-inventory-cell";

function StayRelation({ stay, inTable = false }: { stay: RoomOccupancyStay; inTable?: boolean }) {
  return <div className={styles.relation}>
    <span>{stay.guestName}</span>
    <Link href={`/reservas/${encodeURIComponent(stay.reservationId)}`} className={styles.reservationLink}
      aria-label={`Abrir reserva ${stay.confirmationCode ?? stay.reservationId}`}>
      {stay.confirmationCode ?? stay.reservationId}
    </Link>
    <small className={inTable ? workspace.cellMuted : undefined}><time dateTime={stay.arrival}>{stay.arrival}</time> → <time dateTime={stay.departure}>{stay.departure}</time></small>
  </div>;
}

interface RoomBoardProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  endpoint?: string;
  sessionId?: string;
  timezone?: string;
  propertyName?: string;
  occupancySource?: RoomOccupancySource;
  canManage?: boolean;
  viewControls?: ReactNode;
}

export function RoomBoard({ propertyId, endpoint, sessionId, timezone, propertyName, occupancySource, canManage = false, viewControls }: Readonly<RoomBoardProps>) {
  const { data: rooms, error, isLoading, fetchStatus, refetch } = useRooms(propertyId, endpoint, sessionId);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [date, setDate] = useState(() => hotelOccupancyDay(timezone));
  const [occupancyFilter, setOccupancyFilter] = useState<RoomOccupancyState | 'ALL' | 'UNKNOWN'>('ALL');
  const [roomType, setRoomType] = useState('ALL');
  const [floor, setFloor] = useState('ALL');
  const occupancy = useRoomOccupancy(propertyId, sessionId, date, !!endpoint, rooms, occupancySource);

  const snapshot = occupancy.query.isSuccess && occupancy.query.data?.propertyId === propertyId
    && occupancy.query.data?.date === date ? occupancy.query.data : undefined;
  const occupancyByRoom = new Map(snapshot?.rooms.map(room => [room.roomId, room]));
  const types = [...new Set((rooms ?? []).map(room => room.roomTypeLabel))].sort();
  const floors = [...new Set((rooms ?? []).map(room => room.floor))].sort((a, b) => (a ?? '').localeCompare(b ?? '', 'es', { numeric: true }));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const visible = (rooms ?? []).filter(room => (status === 'ALL' || room.status === status)
    && (occupancyFilter === 'ALL' || (occupancyByRoom.get(room.id)?.state ?? 'UNKNOWN') === occupancyFilter)
    && (roomType === 'ALL' || room.roomTypeLabel === roomType) && (floor === 'ALL' || (room.floor ?? 'UNKNOWN') === floor)
    && normalize(`${room.number} ${room.roomTypeLabel}`).includes(normalize(search.trim())))
    .sort((a, b) => a.number.localeCompare(b.number, 'es', { numeric: true }));
  const pagination = useEntityPagination(visible, JSON.stringify([sessionId, propertyId, search, status, date, occupancyFilter, roomType, floor]));

  if (!propertyId) {
    return <section className={workspace.page} role="status">{viewControls}<p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar habitaciones.</p></section>;
  }

  if (!endpoint) {
    return <section className={workspace.page} role="status">{viewControls}<p>El tablero de habitaciones estará disponible al confirmar el contrato API con Backend.</p></section>;
  }

  if (fetchStatus === 'paused') return <section className={workspace.page} role="status">{viewControls}<p>Sin conexión. Esperando para cargar habitaciones…</p></section>;

  if (isLoading) {
    return <section className={workspace.page} aria-busy="true">{viewControls}<p>Cargando tablero de habitaciones…</p></section>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar habitaciones."
      : "No se pudo cargar el tablero de habitaciones.";

    return <section className={workspace.page} role="alert">{viewControls}<p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></section>;
  }

  if (!rooms) {
    return <section className={workspace.page}>{viewControls}<p>No hay habitaciones para esta propiedad.</p></section>;
  }

  const count = (state: RoomOccupancyState | 'UNKNOWN') => rooms.filter(room => (occupancyByRoom.get(room.id)?.state ?? 'UNKNOWN') === state).length;
  const hasOperation = rooms.some(room => room.status !== null);
  const hasFloor = rooms.some(room => room.floor !== null);
  const clear = () => { setSearch(''); setStatus('ALL'); setOccupancyFilter('ALL'); setRoomType('ALL'); setFloor('ALL'); };

  return <section className={workspace.page}>

    {!rooms.length && <p>No hay habitaciones para esta propiedad.</p>}
    <EntityListSurface label="Lista de habitaciones" showScrollHint={visible.length > 0} filters={<>
      <EntityFilterField label="Buscar habitación" search><input type="search" value={search} placeholder="Número o tipo" onChange={event => setSearch(event.target.value)} /></EntityFilterField>
      <EntityFilterField label="Ocupación"><select value={occupancyFilter} onChange={event => setOccupancyFilter(event.target.value as typeof occupancyFilter)}>
        <option value="ALL">Todas</option>{Object.entries(OCCUPANCY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="UNKNOWN">Sin información</option></select></EntityFilterField>
      <EntityFilterField label="Tipo de habitación"><select value={roomType} onChange={event => setRoomType(event.target.value)}><option value="ALL">Todos los tipos</option>{types.map(type => <option key={type}>{type}</option>)}</select></EntityFilterField>
    </>} filterActions={<button type="button" className={workspace.button} disabled={!search && status === 'ALL' && occupancyFilter === 'ALL' && roomType === 'ALL' && floor === 'ALL'} onClick={clear}>Limpiar filtros</button>} supportingFilters={<>
      <div className={workspace.viewControls}>{viewControls}</div>
      <EntityFilterField label="Fecha de consulta" column={2}><input type="date" value={date} onChange={event => setDate(event.target.value)} aria-invalid={!isOccupancyDay(date)} /></EntityFilterField>
      <div className={workspace.supportActions}>
        <button type="button" className={workspace.button} disabled={!hotelOccupancyDay(timezone)} onClick={() => setDate(hotelOccupancyDay(timezone))}>Hoy</button>
        <button type="button" className={workspace.button} disabled={occupancy.query.isFetching} onClick={() => {
          void refetch();
          if (occupancy.connected && sessionId && isOccupancyDay(date)) void occupancy.query.refetch();
        }}>Actualizar</button>
      </div>
      {hasOperation && <EntityFilterField label="Estado operativo"><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todos</option><option value="ACTIVE">Operativa</option><option value="OOO">OOO · Fuera de orden</option><option value="OOS">OOS · Fuera de servicio</option></select></EntityFilterField>}
      {hasFloor && <EntityFilterField label="Piso"><select value={floor} onChange={event => setFloor(event.target.value)}><option value="ALL">Todos los pisos</option>{floors.map(value => <option key={value ?? 'UNKNOWN'} value={value ?? 'UNKNOWN'}>{value ?? 'Sin piso registrado'}</option>)}</select></EntityFilterField>}
    </>} filterFeedback={<>{!isOccupancyDay(date) && <p role="alert" className={styles.note}>Elige una fecha válida para consultar las estadías.</p>}</>} secondary={<>
    <div className={styles.metrics} role="group" aria-label="Filtrar por ocupación">
      <button type="button" aria-pressed={occupancyFilter === 'ALL'} onClick={() => setOccupancyFilter('ALL')}><strong>{rooms.length}</strong>{' '}<span>Total físico</span></button>
      {(['FREE', 'RESERVED', 'OCCUPIED'] as const).map(state => <button key={state} type="button" aria-pressed={occupancyFilter === state}
        disabled={!snapshot} onClick={() => setOccupancyFilter(state)}><strong>{snapshot ? count(state) : '—'}</strong>{' '}<span>{OCCUPANCY_LABELS[state]}</span></button>)}
    </div>
    {occupancy.query.isFetching && <p role="status" className={styles.notice}>Consultando estadías…</p>}
    {!occupancy.connected && <p className={styles.notice}>La consulta de estadías requiere el contrato de ocupación de Backend.</p>}
    {occupancy.query.isError && <div className={styles.notice} role="alert">No pudimos consultar la ocupación. Las habitaciones mantienen su estado operativo; su ocupación es desconocida. <button className={styles.actionButton} onClick={() => void occupancy.query.refetch()}>Reintentar ocupación</button></div>}
    {!!count('CONFLICT') && <p role="alert" className={styles.notice}>Hay {count('CONFLICT')} habitaciones con estadías superpuestas. Revisa sus reservas antes de asignarlas.</p>}
    {!!snapshot?.unassigned.length && <details className={styles.unassigned} aria-label="Estadías sin habitación asignada">
      <summary>Sin asignar · {snapshot.unassigned.length} {snapshot.unassigned.length === 1 ? 'estadía' : 'estadías'}</summary>
      <ul>{snapshot.unassigned.map(stay => <li key={stay.stayId}><StayRelation stay={stay} /><small>{stay.roomType}</small></li>)}</ul>
    </details>}
    </>} footer={<EntityPagination label="Paginación de habitaciones" noun="habitaciones" pagination={pagination} />}>
      <EntityDataGrid label="Habitaciones del hotel" rows={pagination.rows} getRowKey={room => room.id} minWidth={ENTITY_LIST_TABLE_MIN_WIDTH} readOnly={!canManage}
        emptyState={<span role="status">No hay habitaciones con estos filtros.</span>}
        columns={[
          { key: 'identity', header: 'Identidad', renderEditor: room => <div className={styles.cellGroup}>
            {propertyId && sessionId && room.readOnly ? <StaffInventoryCell propertyId={propertyId} sessionId={sessionId} id={room.id} value={room.number} resource="room" field="code" displayValue={<strong className={workspace.reference}>Habitación {room.number}</strong>} /> : <strong className={workspace.reference}>Habitación {room.number}</strong>}
            <small className={workspace.cellMuted} title={room.id}>ID: {room.id.length > 12 ? `${room.id.slice(0, 8)}…` : room.id}</small>
          </div>, render: room => <div className={styles.cellGroup}>
            <strong className={workspace.reference}>Habitación {room.number}</strong>
            <small className={workspace.cellMuted} title={room.id}>ID: {room.id.length > 12 ? `${room.id.slice(0, 8)}…` : room.id}</small>
          </div> },
          { key: 'context', header: 'Contexto', render: room => <div className={styles.cellGroup}>
            <span className={workspace.cellText}>{room.roomTypeLabel}</span><small className={workspace.cellMuted}>{propertyName ?? room.propertyId}</small>
          </div> },
          { key: 'relation', header: 'Relación', render: room => {
            const assigned = occupancyByRoom.get(room.id);
            return <div className={styles.cellGroup}>{assigned ? assigned.stays.length
              ? assigned.stays.map(stay => <StayRelation key={stay.stayId} stay={stay} inTable />)
              : <span>Sin estadía asignada</span> : <span>Relación no disponible</span>}</div>;
          } },
          { key: 'state', header: 'Estado', render: room => {
            const assigned = occupancyByRoom.get(room.id);
            return <div className={styles.cellGroup}>
              <StatusBadge variant={assigned ? OCCUPANCY_VARIANTS[assigned.state] : 'neutral'} size="sm">
                {assigned ? assigned.state === 'FREE' ? 'Sin estadía' : OCCUPANCY_LABELS[assigned.state] : 'Sin información'}
              </StatusBadge>
              <small className={workspace.cellMuted}>{room.status === null ? 'Estado operativo no disponible' : ROOM_STATUS_LABELS[room.status]}</small>
              {!room.readOnly && room.status !== null && propertyId && endpoint && <details className={styles.localActions}>
                <summary>Acciones de escenario local</summary>
                <RoomStatusPanel room={room} propertyId={propertyId} endpoint={endpoint} />
              </details>}
            </div>;
          } },
        ]} />
    </EntityListSurface>
  </section>;
}

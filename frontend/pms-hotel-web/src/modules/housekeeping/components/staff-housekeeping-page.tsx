'use client';
import { useRef, useState } from 'react';
import { useStaffSession } from '@/modules/auth';
import { usePropertyScope } from '@/modules/properties';
import { HttpStatusError } from '@/lib/http/errors';
import { ConfirmDialog, StatusBadge } from '@/shared/components';
import { useStaffHousekeeping } from '../hooks/use-staff-housekeeping';
import { allowedCleaningTransitions } from '../model/room-cleaning-transition';
import type { HousekeepingChange, StaffHousekeepingRoom } from '../model/staff-housekeeping';
import { CLEANING_STATUS_LABELS, CLEANING_STATUS_VARIANTS } from './cleaning-status-labels';
import styles from './staff-housekeeping.module.css';

export function StaffHousekeepingPage() {
  const session = useStaffSession(); const { ready, scope } = usePropertyScope();
  if (!session.permissions.includes('OPERATIONS_MANAGE')) return <section className={styles.page}><h1>Housekeeping</h1><p role="alert">Tu sesión no tiene permiso para gestionar la limpieza de habitaciones.</p></section>;
  if (!ready) return <p role="status">Preparando la propiedad de tu sesión…</p>;
  if (!scope || scope.kind !== 'PROPERTY') return <section className={styles.page}><h1>Housekeeping</h1><p>Selecciona un hotel en el menú para consultar su tablero de limpieza.</p></section>;
  const propertyId = scope.propertyIds[0], property = session.memberships.find(item => item.active && item.propertyId === propertyId);
  return <HousekeepingWorkspace key={`${session.id}:${propertyId}`} propertyId={propertyId} sessionId={session.id} propertyName={property?.name ?? 'Hotel seleccionado'} timezone={property?.timezone ?? 'UTC'} />;
}
const actionLabels = { DIRTY: 'Volver a limpieza', CLEAN: 'Marcar limpia', INSPECTED: 'Marcar inspeccionada' };
const statusLabel = (room: StaffHousekeepingRoom) => room.status ? CLEANING_STATUS_LABELS[room.status] : 'Sin seguimiento';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function HousekeepingWorkspace({ propertyId, sessionId, propertyName, timezone }: { propertyId: string; sessionId: string; propertyName: string; timezone: string }) {
  const { query, mutation } = useStaffHousekeeping(propertyId, sessionId);
  const [search, setSearch] = useState(''), [status, setStatus] = useState('ALL'), [dnd, setDnd] = useState('ALL'), [type, setType] = useState('ALL');
  const [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState(0);
  const [pending, setPending] = useState<HousekeepingChange | null>(null), [reason, setReason] = useState(''), [notice, setNotice] = useState('');
  const submitting = useRef(false), busy = mutation.isPending || query.isFetching;
  async function refresh() { if (submitting.current) return; setPending(null); setNotice(''); mutation.reset(); await query.refetch(); }
  function open(change: HousekeepingChange) { if (busy || mutation.isError) return; setNotice(''); setReason(''); mutation.reset(); setPending(change); }
  async function confirm() {
    if (!pending || submitting.current || mutation.isError || (pending.action === 'status' && pending.toStatus === 'DIRTY' && !reason.trim())) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync(pending.action === 'status' ? { ...pending, reason: pending.toStatus === 'DIRTY' ? reason.trim() : null } : pending);
      setPending(null); setNotice('Cambio guardado. El tablero está actualizado.');
    } catch { /* Refresh before retrying an uncertain write. */ }
    finally { submitting.current = false; }
  }
  const header = <header className={styles.header}><div><p className={styles.eyebrow}>OPERACIÓN DEL HOTEL</p><h1>Housekeeping</h1><p>{propertyName} · Limpieza y preparación de habitaciones</p></div><button className={styles.secondary} onClick={() => void refresh()} disabled={busy}>Actualizar tablero</button></header>;
  if (query.fetchStatus === 'paused') return <section className={styles.page}>{header}<p role="status">Sin conexión. Esperando para consultar el tablero.</p></section>;
  if (query.isPending || query.isFetching) return <section className={styles.page} aria-busy="true">{header}<p role="status">Consultando el estado de las habitaciones…</p></section>;
  if (query.isError || !query.data) return <section className={styles.page}>{header}<div className={styles.alert} role="alert"><h2>No pudimos consultar Housekeeping</h2><p>{query.error instanceof HttpStatusError && query.error.status === 403 ? 'Tu sesión no tiene acceso a esta propiedad o a este módulo.' : 'Comprueba tu conexión y vuelve a actualizar el tablero.'}</p><button className={styles.secondary} onClick={() => void refresh()}>Reintentar consulta</button></div></section>;
  const rooms = query.data.rooms;
  const visible = rooms.filter(room => (status === 'ALL' || (status === 'UNTRACKED' ? !room.tracked : room.status === status)) && (dnd === 'ALL' || (dnd === 'ON' ? room.dnd === true : room.dnd === false)) && (type === 'ALL' || room.roomTypeId === type) && normalize(`${room.roomCode} ${room.roomTypeName}`).includes(normalize(search.trim())));
  const pages = Math.max(1, Math.ceil(visible.length / 10)), currentPage = Math.min(page, pages - 1), shown = visible.slice(currentPage * 10, currentPage * 10 + 10);
  const room = shown.find(item => item.roomId === selected) ?? shown[0], types = [...new Map(rooms.map(item => [item.roomTypeId, item.roomTypeName])).entries()];
  const errorMessage = mutation.error instanceof HttpStatusError && mutation.error.status === 409 ? 'Esta habitación cambió desde tu última consulta. Actualiza los datos antes de volver a aplicar una acción.' : mutation.error instanceof HttpStatusError && [401,403].includes(mutation.error.status) ? 'Tu sesión ya no permite esta acción. Actualiza para comprobar el acceso.' : 'No pudimos confirmar el resultado del cambio. Actualiza los datos antes de intentarlo otra vez.';
  const mutationError = mutation.isError ? <div role="alert" className={styles.alert}><p>{errorMessage}</p><button className={styles.secondary} onClick={() => void refresh()}>Actualizar datos</button></div> : null;
  const label = pending ? pending.action === 'tracking' ? 'Iniciar seguimiento' : pending.action === 'dnd' ? pending.dnd ? 'Activar No molestar' : 'Desactivar No molestar' : pending.room.status === 'INSPECTED' && pending.toStatus === 'DIRTY' ? 'Rechazar inspección' : actionLabels[pending.toStatus] : '';
  return <section className={styles.page}>{header}
    <div className={styles.metrics} aria-label="Resumen de limpieza">{[['Habitaciones',rooms.length],['Por limpiar',rooms.filter(r => r.status === 'DIRTY').length],['Por inspeccionar',rooms.filter(r => r.status === 'CLEAN').length],['Inspeccionadas',rooms.filter(r => r.status === 'INSPECTED').length],['Sin seguimiento',rooms.filter(r => !r.tracked).length]].map(([name,count]) => <div className={styles.metric} key={name}><span>{name}</span><strong>{count}</strong></div>)}</div>
    <p className={styles.hint}>La limpieza se gestiona por separado de la ocupación y de los bloqueos OOO/OOS. «Sin seguimiento» no indica que una habitación esté limpia o sucia.</p>
    <div className={styles.filters} aria-label="Filtros de Housekeeping">
      <label>Buscar habitación<input value={search} placeholder="Número o tipo de habitación" onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
      <label>Estado de limpieza<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="ALL">Todos los estados</option><option value="DIRTY">Sucia</option><option value="CLEAN">Limpia</option><option value="INSPECTED">Inspeccionada</option><option value="UNTRACKED">Sin seguimiento</option></select></label>
      <label>Tipo de habitación<select value={type} onChange={event => { setType(event.target.value); setPage(0); }}><option value="ALL">Todos los tipos</option>{types.map(([id,name]) => <option value={id} key={id}>{name}</option>)}</select></label>
      <label>No molestar<select value={dnd} onChange={event => { setDnd(event.target.value); setPage(0); }}><option value="ALL">Todas</option><option value="ON">DND activo</option><option value="OFF">DND inactivo</option></select></label>
      <button className={styles.secondary} onClick={() => { setSearch(''); setStatus('ALL'); setType('ALL'); setDnd('ALL'); setPage(0); }}>Limpiar filtros</button>
    </div>{notice && <p className={styles.success} role="status">{notice}</p>}{!pending && mutationError}
    <div className={styles.layout}><section className={styles.panel} aria-label="Habitaciones de Housekeeping"><div className={styles.listHeader}><h2>Habitaciones</h2><span aria-live="polite">{visible.length} resultados</span></div>
      {!shown.length ? <p>{rooms.length ? 'No hay habitaciones que coincidan con los filtros.' : 'Este hotel todavía no tiene habitaciones físicas registradas.'}</p> : <ul className={styles.list}>{shown.map(item => <li key={item.roomId}><button className={styles.room} aria-pressed={room?.roomId === item.roomId} onClick={() => setSelected(item.roomId)}><span><strong>Habitación {item.roomCode}</strong><small>{item.roomTypeName}</small></span><span className={styles.badges}><CleaningBadge room={item} />{item.dnd && <span className={styles.dnd}>No molestar</span>}</span></button></li>)}</ul>}
      {pages > 1 && <nav className={styles.pagination} aria-label="Paginación de Housekeeping"><button className={styles.secondary} disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelected(null); }}>Anterior</button><span>{currentPage + 1} / {pages}</span><button className={styles.secondary} disabled={currentPage + 1 === pages} onClick={() => { setPage(currentPage + 1); setSelected(null); }}>Siguiente</button></nav>}
    </section>{room && <aside className={`${styles.panel} ${styles.detail}`} aria-label="Detalle de limpieza"><p className={styles.eyebrow}>DETALLE DE HABITACIÓN</p><h2>Habitación {room.roomCode}</h2><p>{room.roomTypeName}</p><CleaningBadge room={room} />
      <dl><div><dt>No molestar</dt><dd>{room.dnd === null ? 'Sin registrar' : room.dnd ? 'Activado' : 'Desactivado'}</dd></div><div><dt>Última actualización</dt><dd>{room.updatedAt ? new Intl.DateTimeFormat('es-GT', { dateStyle:'medium', timeStyle:'short', timeZone:timezone }).format(new Date(room.updatedAt)) : 'Sin registro'}</dd></div></dl>
      <h3>Acciones de limpieza</h3><div className={styles.actions}>{!room.tracked ? <><p>Inicia el seguimiento para registrar esta habitación como pendiente de limpieza.</p><button className={styles.primary} disabled={busy || mutation.isError} onClick={() => open({ room, action:'tracking' })}>Iniciar seguimiento</button></> : <>{room.status && allowedCleaningTransitions(room.status).map(target => <button className={target === 'DIRTY' ? styles.secondary : styles.primary} key={target} disabled={busy || mutation.isError} onClick={() => open({ room, action:'status', toStatus:target, reason:null })}>{room.status === 'INSPECTED' && target === 'DIRTY' ? 'Rechazar inspección' : actionLabels[target]}</button>)}<button className={styles.secondary} disabled={busy || mutation.isError} onClick={() => open({ room, action:'dnd', dnd:!room.dnd })}>{room.dnd ? 'Desactivar No molestar' : 'Activar No molestar'}</button></>}</div>{room.dnd && <p className={styles.hint}>DND está activo. Este indicador no cambia el estado de limpieza.</p>}
    </aside>}</div>
    {pending && <ConfirmDialog title={label} confirmLabel="Guardar cambio" busyLabel="Guardando…" busy={mutation.isPending} confirmDisabled={mutation.isError || (pending.action === 'status' && pending.toStatus === 'DIRTY' && !reason.trim())} destructive={pending.action === 'status' && pending.toStatus === 'DIRTY'}
      body={<><p>Habitación {pending.room.roomCode} · {pending.room.roomTypeName}</p><p>{pending.action === 'tracking' ? 'Se registrará como pendiente de limpieza. Esto no cambia su ocupación ni disponibilidad.' : pending.action === 'dnd' ? 'Solo se actualizará el indicador No molestar.' : `Estado actual: ${statusLabel(pending.room)}. Nuevo estado: ${CLEANING_STATUS_LABELS[pending.toStatus]}.`}</p>{pending.action === 'status' && pending.toStatus === 'DIRTY' && <div className={styles.reason}><label htmlFor="housekeeping-reason">Motivo (obligatorio)</label><textarea id="housekeeping-reason" aria-describedby="housekeeping-reason-count" value={reason} maxLength={280} rows={3} onChange={event => setReason(event.target.value)} /><small id="housekeeping-reason-count">{reason.length}/280 caracteres</small></div>}{mutationError}</>}
      onConfirm={() => void confirm()} onCancel={() => { if (!submitting.current) setPending(null); }} />}
  </section>;
}
function CleaningBadge({ room }: { room: StaffHousekeepingRoom }) {
  return room.status ? <StatusBadge variant={CLEANING_STATUS_VARIANTS[room.status]}>{CLEANING_STATUS_LABELS[room.status]}</StatusBadge> : <span className={styles.untracked}>Sin seguimiento</span>;
}

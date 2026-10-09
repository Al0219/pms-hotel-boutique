'use client';

import { useState, type ReactNode } from 'react';
import { getPublicEnvironment } from '@/lib/env';
import { useStaffSession } from '@/modules/auth';
import { usePropertyScope } from '@/modules/properties';
import { CalendarGantt, ReservationCenter, ReservationDetail, StaffNewReservation, useStaffReservationStays } from '@/modules/reservations';
import { RoomBoard, RoomCatalogAdmin } from '@/modules/rooms';
import styles from './staff-property-workspace.module.css';

function StaffPropertyWorkspace({ children }: { children: (propertyId: string, sessionId: string) => ReactNode }) {
  const session = useStaffSession();
  const { ready, scope } = usePropertyScope();
  if (!ready) return <p role="status">Preparando la propiedad de tu sesión…</p>;
  if (!scope || scope.kind !== 'PROPERTY') return <section className={styles.notice}><h1>Selecciona una propiedad</h1><p>Para consultar reservas o administrar habitaciones, elige un hotel específico en el selector del menú Staff.</p></section>;
  return children(scope.propertyIds[0], session.id);
}

/** Staff reads always use the authenticated same-origin BFF, independent of data mocks. */
export function StaffReservationsWorkspace({ reservationId, endpoint }: { reservationId?: string; endpoint?: string }) {
  const session = useStaffSession();
  const canAssign = session.permissions.includes('RESERVATION_MANAGE');
  const resource = endpoint ?? '/api/staff/reservations';
  return <StaffPropertyWorkspace>{(propertyId, sessionId) => reservationId
    ? <ReservationDetail key={`${sessionId}:${propertyId}:${reservationId}`} reservationId={reservationId} propertyId={propertyId} endpoint={resource} sessionId={sessionId} canManage={canAssign} />
    : <ReservationCenter key={`${sessionId}:${propertyId}`} propertyId={propertyId} endpoint={resource} canCreate={false} />}</StaffPropertyWorkspace>;
}

export function StaffNewReservationWorkspace() {
  const session = useStaffSession();
  const canCreate = session.permissions.includes('RESERVATION_MANAGE') || session.roleId === 'SUPER_ADMIN';
  return <StaffPropertyWorkspace>{(propertyId, sessionId) => {
    const property = session.memberships.find(item => item.propertyId === propertyId && item.active);
    return property ? <StaffNewReservation key={`${sessionId}:${propertyId}`} propertyId={propertyId} sessionId={sessionId}
      propertyName={property.name} timezone={property.timezone} canCreate={canCreate} />
      : <p role="alert">No se pudo resolver una propiedad autorizada para crear la reserva.</p>;
  }}</StaffPropertyWorkspace>;
}

export function StaffRoomsWorkspace() {
  const session = useStaffSession();
  const mock = getPublicEnvironment().useMockApi;
  const canManage = session.permissions.includes('COMMERCIAL_MANAGE')
    || (mock && ['superadmin', 'gerencia'].includes(session.roleId));
  return <StaffPropertyWorkspace>{(propertyId, sessionId) => {
    const property = session.memberships.find(item => item.propertyId === propertyId && item.active);
    return <RoomsContent key={`${sessionId}:${propertyId}`} propertyId={propertyId} sessionId={sessionId}
      propertyName={property?.name} timezone={property?.timezone} canManage={canManage} endpoint={mock ? 'http://pms.test/rooms' : '/api/staff/rooms'} />;
  }}</StaffPropertyWorkspace>;
}

function RoomsContent({ propertyId, sessionId, canManage, endpoint, propertyName, timezone }: {
  propertyId: string; sessionId: string; canManage: boolean; endpoint?: string; propertyName?: string; timezone?: string;
}) {
  const mock = getPublicEnvironment().useMockApi;
  const stays = useStaffReservationStays(propertyId, sessionId, !mock);
  const [view, setView] = useState<'board' | 'catalog'>('board');
  const viewControls = <div className={styles.views} role="group" aria-label="Vistas de habitaciones">
      <button aria-pressed={view === 'board'} onClick={() => setView('board')}>Tablero operativo</button>
      <button aria-pressed={view === 'catalog'} onClick={() => setView('catalog')}>Administrar inventario</button>
    </div>;
  return <div>
    {view === 'board' ? <RoomBoard viewControls={viewControls} propertyId={propertyId} sessionId={sessionId} propertyName={propertyName} timezone={timezone} endpoint={endpoint} occupancySource={mock ? undefined : stays} canManage={!mock && canManage} /> : <>{viewControls}<RoomCatalogAdmin propertyId={propertyId} sessionId={sessionId} canManage={canManage} /></>}
  </div>;
}

export function StaffCalendarWorkspace() {
  return <StaffPropertyWorkspace>{(propertyId, sessionId) =>
    <CalendarGantt key={`${sessionId}:${propertyId}`} propertyId={propertyId} sessionId={sessionId} />
  }</StaffPropertyWorkspace>;
}

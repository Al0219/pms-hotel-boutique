'use client';

import { useState, type ReactNode } from 'react';
import { RoomPhotoCarousel } from '@/modules/booking';
import type { ReservationDetailData, ReservationStayDetail } from '../model/reservation-detail';
import styles from './staff-reservation-overview.module.css';

const day = (value: Date) => value.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const instant = (value: Date) => value.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
const language = (value: string | null) => value === 'es' ? 'Español' : value === 'en' ? 'English' : value;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children || <span className={styles.missing}>No registrado</span>}</dd></div>;
}

function StayInformation({ stay }: { stay: ReservationStayDetail }) {
  const [expanded, setExpanded] = useState(false);
  return <details className={styles.roomDetails} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary aria-label={`Ver habitación y ocupantes: ${stay.roomLabel ?? stay.roomType}`}>Ver habitación y ocupantes <span aria-hidden="true">⌄</span></summary>
    <div className={styles.roomInformation}>
      <div>
        <dl className={styles.fields}>
          <Field label="Tipo de habitación">{stay.roomType}</Field>
          <Field label="Código del tipo">{stay.roomTypeCode}</Field>
          <Field label="Habitación física">{stay.roomLabel ?? 'Sin asignar'}</Field>
          <Field label="Último cambio de la estadía">{stay.updatedAt ? instant(new Date(stay.updatedAt)) : null}</Field>
        </dl>
        <h3>Ocupantes registrados</h3>
        {stay.occupants === undefined ? <p className={styles.missing}>Información de ocupantes no disponible.</p>
          : stay.occupants.length === 0 ? <p className={styles.missing}>No se han registrado ocupantes para esta estadía.</p>
          : <ul className={styles.occupants}>{stay.occupants.map(guest => <li key={guest.profileId}><span>{guest.fullName}</span>
            {guest.primary && <span className={styles.tag}>Principal de esta estadía</span>}</li>)}</ul>}
        <p className={styles.hint}>El responsable de la reserva puede ser distinto de las personas que se hospedan.</p>
      </div>
      <div className={styles.photos}>
        {expanded && (stay.presentation?.images.length ? <RoomPhotoCarousel key={stay.id} images={stay.presentation.images} name={stay.roomType} />
          : <div className={styles.noPhotos}>No hay fotografías disponibles para este tipo de habitación.</div>)}
        {stay.presentation?.description && <p>{stay.presentation.description}</p>}
        <p className={styles.hint}>Referencia visual del tipo en el catálogo actual. La asignación física se muestra por separado.</p>
      </div>
    </div>
    <details className={styles.identifiers}><summary>Referencias técnicas de la estadía</summary><dl className={styles.fields}>
      <Field label="ID de estadía">{stay.id}</Field><Field label="ID del tipo">{stay.roomTypeId}</Field><Field label="ID de habitación">{stay.roomId}</Field>
    </dl></details>
  </details>;
}

export function StaffReservationOverview({ detail, renderStay }: {
  detail: ReservationDetailData; renderStay: (stay: ReservationStayDetail) => ReactNode;
}) {
  const contact = detail.information?.contact;
  const starts = detail.stays.map(stay => stay.checkIn.getTime()), ends = detail.stays.map(stay => stay.checkOut.getTime());
  const dates = starts.length ? `${day(new Date(Math.min(...starts)))} → ${day(new Date(Math.max(...ends)))}` : 'Sin fechas de estadía';
  const roomNights = detail.stays.reduce((total, stay) => total + stay.nights, 0);
  return <div className={styles.layout}>
    <section className={styles.summary} aria-labelledby="reservation-data-title">
      <div><p className={styles.overline}>RESUMEN DE LA ESTADÍA</p><h2 id="reservation-data-title">Datos de la reserva</h2><p>{dates}</p></div>
      <div className={styles.metrics}><div><strong>{detail.stays.length}</strong><span>{detail.stays.length === 1 ? 'estancia' : 'estancias'}</span></div>
        <div><strong>{roomNights}</strong><span>{roomNights === 1 ? 'noche de habitación' : 'noches de habitación'}</span></div>
        <div><strong>{detail.stays.filter(stay => stay.roomId !== null).length}/{detail.stays.length}</strong><span>habitaciones asignadas</span></div></div>
    </section>

    <div className={styles.columns}>
      <details className={styles.card}>
        <summary><span><span className={styles.overline}>CLIENTE</span><strong>Responsable de la reserva</strong><span>{detail.guest.primaryName ?? 'No registrado'}</span></span><span className={styles.expand}>Ver contacto <span aria-hidden="true">⌄</span></span></summary>
        {detail.information ? <><dl className={styles.fields}>
          <Field label="Correo electrónico">{contact?.email}</Field><Field label="Teléfono">{contact?.phone}</Field>
          <Field label="País / región">{contact?.country ? new Intl.DisplayNames(['es'], { type: 'region' }).of(contact.country) : null}</Field>
          <Field label="Idioma preferido">{contact ? language(contact.preferredLanguage) : null}</Field>
          <Field label="Tipo de documento">{contact?.documentType}</Field><Field label="Documento protegido">{contact?.documentNumberMasked}</Field>
        </dl><p className={styles.hint}>Datos del perfil responsable asociado a esta reserva. El documento se muestra parcialmente por privacidad.</p></>
          : <p className={styles.missing}>Información de contacto adicional no disponible.</p>}
      </details>
      <details className={styles.card}>
        <summary><span><span className={styles.overline}>SEGUIMIENTO</span><strong>Notas y referencias</strong><span>{detail.notes ? 'Hay notas registradas' : 'Sin notas registradas'}</span></span><span className={styles.expand}>Ver más <span aria-hidden="true">⌄</span></span></summary>
        <h3>Notas de la reserva</h3><p className={styles.notes}>{detail.notes ?? 'No hay notas ni solicitudes registradas en esta reserva.'}</p>
        <dl className={styles.fields}>
          <Field label="Origen">{detail.source.label}</Field><Field label="Referencia del origen">{detail.source.reference}</Field>
          <Field label="Creada">{instant(detail.createdAt)}</Field>
          <Field label="Último cambio de la reserva">{detail.information ? instant(detail.information.updatedAt) : null}</Field>
          <Field label="Moneda de la reserva">{detail.currency}</Field><Field label="ID de reserva">{detail.id}</Field>
        </dl>
      </details>
    </div>

    <section className={styles.stays} aria-labelledby="reservation-stays-title">
      <div className={styles.sectionHeading}><h2 id="reservation-stays-title">Estancias y habitaciones</h2><span>Revisa cada habitación por separado</span></div>
      {detail.stays.length === 0 ? <p className={styles.empty}>Sin estadías registradas.</p> : detail.stays.map((stay, index) =>
        <article className={styles.stayCard} key={stay.id} aria-label={`Estancia ${index + 1}: ${stay.roomLabel ?? stay.roomType}`}><p className={styles.overline}>ESTANCIA {index + 1}</p>{renderStay(stay)}<StayInformation stay={stay} /></article>)}
    </section>
  </div>;
}

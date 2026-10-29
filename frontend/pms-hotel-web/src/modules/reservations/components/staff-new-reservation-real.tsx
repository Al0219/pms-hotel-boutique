'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useStaffBooking } from '../hooks/use-staff-booking';
import { calendarDay, stayNights } from '../model/staff-reservation-create';
import type { StaffBookingGuest, StaffBookingSearch } from '../model/staff-booking';
import styles from './staff-new-reservation.module.css';

interface Props { propertyId: string; propertyName: string; timezone: string; sessionId: string; canCreate: boolean }
function hotelDay(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
  } catch { return ''; }
}
function nextDay(value: string) { return calendarDay(value) ? new Date(Date.parse(value+'T00:00:00Z')+86400000).toISOString().slice(0,10) : ''; }
const money = (minor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(minor/100);

export function StaffNewReservationReal({ propertyId, propertyName, timezone, sessionId, canCreate }: Props) {
  const today = hotelDay(timezone);
  const [search, setSearch] = useState<StaffBookingSearch>(() => ({ arrival: today, departure: nextDay(today), rooms: 1 }));
  const [guest, setGuest] = useState<StaffBookingGuest>({ firstName: '', lastName: '', email: '', phone: '' });
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<1|2|3>(1), [criteria, setCriteria] = useState<StaffBookingSearch>();
  const [selected, setSelected] = useState(''), [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const form = useRef<HTMLFormElement>(null);
  const booking = useStaffBooking(propertyId, sessionId, canCreate, criteria);
  const quote = booking.query.data;
  const option = quote?.options.find(item => item.roomTypeId === selected);
  const nights = stayNights(search.arrival, search.departure);
  const errors: Record<string,string|undefined> = {
    arrival: !calendarDay(search.arrival) || search.arrival < today ? 'Elige una llegada desde hoy, según la hora del hotel.' : undefined,
    departure: !nights ? 'La salida debe ser posterior a la llegada.' : undefined,
    rooms: !Number.isSafeInteger(search.rooms) || search.rooms < 1 ? 'Indica al menos una habitación.' : undefined,
    firstName: !guest.firstName.trim() || guest.firstName.length > 80 ? 'Ingresa el nombre del huésped (máximo 80 caracteres).' : undefined,
    lastName: !guest.lastName.trim() || guest.lastName.length > 80 ? 'Ingresa sus apellidos (máximo 80 caracteres).' : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()) || guest.email.length > 320 ? 'Ingresa un correo electrónico válido.' : undefined,
    phone: !/^\+?[0-9 ()-]{7,32}$/.test(guest.phone.trim()) || guest.phone.replace(/\D/g,'').length < 7 ? 'Ingresa un teléfono válido, por ejemplo +502 5555 5555.' : undefined,
    notes: notes.length > 300 ? 'Usa un máximo de 300 caracteres.' : undefined,
  };
  const visible = (field: string) => (submitted || touched[field]) && errors[field];
  const fieldProps = (field: string) => ({ 'aria-invalid': !!visible(field), 'aria-describedby': visible(field) ? `staff-new-${field}-error` : undefined,
    onBlur: () => setTouched(current => ({ ...current, [field]: true })) });
  const errorText = (field: string) => visible(field) ? <p id={`staff-new-${field}-error`} className={styles.fieldError}>{errors[field]}</p> : null;
  function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitted(true);
    const invalid = Object.keys(errors).find(field => errors[field]);
    if (invalid) { form.current?.querySelector<HTMLInputElement>(`#staff-new-${invalid}`)?.focus(); return; }
    booking.clearError(); setCriteria({ ...search }); setSelected(''); setStep(2);
  }
  const locked = booking.busy || booking.uncertain;
  if (!canCreate) return <section className={styles.page}><h1>Nueva reserva</h1><p role="alert">Tu sesión no tiene permiso para crear reservas en esta propiedad.</p><Link href="/reservas">Volver a reservas</Link></section>;
  if (!calendarDay(today)) return <section className={styles.page}><h1>Nueva reserva</h1><p role="alert">No se pudo resolver la hora local del hotel.</p></section>;
  if (booking.result) return <section className={styles.page}><div className={styles.success} role="status">
    <span className={styles.successIcon} aria-hidden="true">✓</span><p className={styles.overline}>RECEPCIÓN · {propertyName}</p>
    <h1>Reserva registrada</h1><p>El alojamiento quedó registrado como pendiente de pago. No se realizó ningún cobro.</p>
    <dl><div><dt>Huésped principal</dt><dd>{guest.firstName} {guest.lastName}</dd></div>
      <div><dt>Estadía</dt><dd>{search.arrival} → {search.departure} · {nights} {nights === 1 ? 'noche' : 'noches'}</dd></div>
      <div><dt>Habitaciones</dt><dd>{search.rooms} · Asignación desde el detalle</dd></div></dl>
    <p>Abre el detalle para consultar el código y estado actual, asignar una habitación apta y realizar el check-in cuando corresponda.</p>
    <div className={styles.actions}><Link className={styles.primary} href={`/reservas/${booking.result.reservationId}`}>Ver reserva y asignar habitación</Link>
      <Link className={styles.secondary} href="/reservas">Ir al Centro de Reservas</Link></div>
  </div></section>;
  return <section className={styles.page} aria-busy={booking.busy}>
    <Link className={styles.back} href="/reservas" aria-disabled={locked || undefined} onClick={event => { if (locked) event.preventDefault(); }}>← Volver a reservas</Link>
    <header className={styles.header}><p className={styles.overline}>RECEPCIÓN · {propertyName}</p><h1>Nueva reserva</h1>
      <p>Registra la estadía del huésped y después asigna su habitación desde el detalle.</p></header>
    <ol className={styles.steps} aria-label="Pasos de nueva reserva">{['Estadía y huésped','Habitaciones y tarifa','Revisa la reserva'].map((label,index) =>
      <li key={label} aria-current={step === index+1 ? 'step' : undefined} data-complete={step > index+1}><span className={styles.stepNumber}>{step > index+1 ? '✓' : index+1}</span><span>{label}</span></li>)}</ol>
    <div className={styles.layout}><div>
      {step === 1 ? <form ref={form} className={styles.card} onSubmit={consult} noValidate>
        <h2>Datos de la estadía</h2><p className={styles.helper}>Fechas según la hora local de {propertyName}.</p>
        <div className={styles.fields}>
          <div><label htmlFor="staff-new-arrival">Check-in *</label><input id="staff-new-arrival" type="date" required min={today} value={search.arrival} {...fieldProps('arrival')}
            onChange={event => setSearch(current => ({ ...current, arrival: event.target.value, departure: current.departure <= event.target.value ? nextDay(event.target.value) : current.departure }))} />{errorText('arrival')}</div>
          <div><label htmlFor="staff-new-departure">Check-out *</label><input id="staff-new-departure" type="date" required min={nextDay(search.arrival)} value={search.departure} {...fieldProps('departure')}
            onChange={event => setSearch(current => ({ ...current, departure: event.target.value }))} />{errorText('departure')}</div>
          <div><label htmlFor="staff-new-rooms">Habitaciones *</label><input id="staff-new-rooms" type="number" required min={1} step={1} value={search.rooms} {...fieldProps('rooms')}
            onChange={event => setSearch(current => ({ ...current, rooms: Number(event.target.value) }))} />{errorText('rooms')}</div>
        </div><div className={styles.divider} /><h2>Huésped principal</h2><p className={styles.helper}>La persona responsable de la reserva no necesita crear una cuenta.</p>
        <div className={styles.fields}>{(['firstName','lastName','email','phone'] as const).map(field => <div key={field}>
          <label htmlFor={`staff-new-${field}`}>{({ firstName:'Nombre',lastName:'Apellidos',email:'Correo electrónico',phone:'Teléfono' })[field]} *</label>
          <input id={`staff-new-${field}`} required type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} maxLength={field === 'email' ? 320 : field === 'phone' ? 32 : 80}
            autoComplete={({ firstName:'given-name',lastName:'family-name',email:'email',phone:'tel' })[field]} value={guest[field]} {...fieldProps(field)}
            onChange={event => setGuest(current => ({ ...current, [field]: event.target.value }))} />{errorText(field)}</div>)}</div>
        <div className={styles.fields}><div className={styles.fullWidth}><label htmlFor="staff-new-notes">Notas y solicitudes especiales</label><textarea id="staff-new-notes" maxLength={300} rows={3} value={notes} {...fieldProps('notes')} onChange={event => setNotes(event.target.value)} />
          <small className={styles.counter}>{notes.length}/300</small>{errorText('notes')}</div></div>
        <div className={styles.actions}><button className={styles.primary} type="submit">Consultar disponibilidad →</button></div>
      </form> : step === 2 ? <section className={styles.card}><div className={styles.sectionHeader}><h2>Habitaciones y tarifa</h2>
        <button className={styles.textButton} onClick={() => { booking.clearError(); setStep(1); }}>Editar datos</button></div>
        <p className={styles.helper}>La disponibilidad se consulta por tipo y fechas. Al asignar la habitación física se revisan su limpieza y sus bloqueos.</p>
        {booking.query.isPending || booking.query.isFetching ? <p role="status">Consultando disponibilidad…</p>
          : booking.query.isError ? <div role="alert" className={styles.error}><p>No pudimos consultar las habitaciones. Comprueba tu sesión y vuelve a intentarlo.</p><button onClick={() => void booking.query.refetch()}>Reintentar consulta</button></div>
          : !quote?.options.length ? <div className={styles.empty}><h3>Sin opciones disponibles</h3><p>No encontramos habitaciones con disponibilidad y tarifa para estas fechas. Modifica la búsqueda.</p></div>
          : <fieldset className={styles.options}><legend>Elige un tipo de habitación</legend>{quote.options.map(item => <label key={item.roomTypeId} className={styles.option} data-selected={selected === item.roomTypeId}>
            <input type="radio" name="staff-booking-option" checked={selected === item.roomTypeId} onChange={() => setSelected(item.roomTypeId)} />
            <span><strong>{item.roomTypeName}</strong><small className={styles.optionMeta}>{item.availableRooms} habitaciones disponibles · Tarifa vigente</small></span>
            <span className={styles.optionPrice}>{money(item.nightlyMinor)}<small>por habitación / noche · Total {money(item.totalMinor)}</small></span></label>)}</fieldset>}
        <div className={styles.actions}><button className={styles.primary} disabled={!option || booking.query.isFetching} onClick={() => setStep(3)}>Revisar reserva</button></div>
      </section> : <section className={styles.card}><h2>Revisa la reserva</h2>
        <div className={styles.reviewBlock}><h3>Estadía</h3><p>{option?.roomTypeName} · {search.rooms} {search.rooms === 1 ? 'habitación' : 'habitaciones'}</p><p>{search.arrival} → {search.departure} · {nights} {nights === 1 ? 'noche' : 'noches'}</p></div>
        <div className={styles.reviewBlock}><h3>Huésped principal</h3><p>{guest.firstName} {guest.lastName}</p><p>{guest.email} · {guest.phone}</p></div>
        <div className={styles.reviewBlock}><h3>Solicitudes especiales</h3><p>{notes.trim() || 'Sin solicitudes adicionales'}</p></div>
        <p className={styles.notice}>La reserva se confirma con el alojamiento pendiente de pago. No se cobra ni asigna una habitación al crearla. El check-in se realiza después de asignar una habitación inspeccionada.</p>
        {booking.error && <div role="alert" className={styles.error}><p>{booking.error}</p>{booking.uncertain
          ? <><p>Reintenta la misma solicitud antes de modificarla o salir de esta pantalla.</p><button className={styles.secondary} disabled={booking.busy} onClick={() => void booking.retry()}>Reintentar la misma reserva</button></>
          : <button className={styles.secondary} onClick={() => { booking.clearError(); setSelected(''); setStep(2); void booking.query.refetch(); }}>Volver a disponibilidad</button>}</div>}
        <div className={styles.actions}><button className={styles.secondary} disabled={locked} onClick={() => setStep(2)}>Cambiar selección</button>
          <button className={styles.primary} disabled={locked || !quote || !option || booking.query.isFetching} onClick={() => { if (quote && option) void booking.create(quote,option,guest,notes); }}>
            {booking.busy ? 'Registrando reserva…' : 'Confirmar y crear reserva'}</button></div>
      </section>}
    </div><aside className={`${styles.card} ${styles.summary}`}><p className={styles.overline}>RESUMEN</p><h2>Tu reserva</h2><p>{propertyName}</p>
      <dl><div><dt>Check-in</dt><dd>{search.arrival}</dd></div><div><dt>Check-out</dt><dd>{search.departure}</dd></div><div><dt>Duración</dt><dd>{nights} {nights === 1 ? 'noche' : 'noches'}</dd></div><div><dt>Habitaciones</dt><dd>{search.rooms}</dd></div></dl>
      <div className={styles.divider} />{option ? <><strong>{option.roomTypeName}</strong><p className={styles.helper}>{money(option.nightlyMinor)} × {nights} {nights === 1 ? 'noche' : 'noches'} × {search.rooms} {search.rooms === 1 ? 'habitación' : 'habitaciones'}</p>
        <div className={styles.total}><span>Alojamiento pendiente</span><strong>{money(option.totalMinor)}</strong></div></> : <p className={styles.helper}>Consulta disponibilidad para ver el importe del alojamiento.</p>}
      <p className={styles.summaryNote}>Se verifican nuevamente disponibilidad y tarifa antes de guardar. La salida estará bloqueada mientras exista saldo pendiente.</p>
    </aside></div>
  </section>;
}

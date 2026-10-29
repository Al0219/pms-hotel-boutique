'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useGuestSession} from '@/modules/auth';
import {HttpStatusError} from '@/lib/http/errors';
import {useGuestReservationSummary} from '../hooks/use-linked-guest-reservations';
import {ReservationLookupDetails} from './reservation-lookup-details';
import styles from './real-guest-reservations.module.css';
export function GuestReservationSummary({reservationId}:{reservationId:string}){
  const query=useGuestReservationSummary(reservationId);const {account}=useGuestSession();const router=useRouter();
  const failed=query.isError||query.fetchStatus==='paused';
  return <section className={styles.page}><div className={styles.container}><Link className={styles.back} href="/cuenta/reservas">← Volver a mis reservas</Link><header className={styles.header}><h1>Detalle de tu reserva</h1></header>
    {query.isPending&&!failed&&<p role="status">Consultando los detalles de tu reserva…</p>}
    {failed&&<div className={styles.feedback}><p role="alert">{query.error instanceof HttpStatusError&&query.error.status===404?'No encontramos esta reserva vinculada a tu cuenta.':'No pudimos consultar esta reserva. Tu reserva se conserva; puedes reintentar.'}</p><button type="button" className={styles.secondary} onClick={()=>void query.refetch()}>Reintentar consulta</button></div>}
    {query.data&&!failed&&account&&<ReservationLookupDetails result={query.data} contactEmail={account.email ?? "No indicado"} authenticated onClose={()=>router.push('/cuenta/reservas')}/>}
  </div></section>;
}

"use client";
import { AccountFeedback, AccountSection } from "@/modules/account";
import { useRewards } from "../hooks/use-rewards";
import styles from "./rewards-page.module.css";

export function RewardsPage() {
  const query = useRewards();
  const data = query.data;
  return <AccountSection title="Rewards y beneficios" description="Consulta el saldo, nivel y movimientos de tu cuenta.">
    <AccountFeedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {!query.error && data && <>
      <section className={styles.tierCard} aria-label="Saldo y nivel">
        <h2>{data.currentTier}</h2><p>Saldo: {data.pointsBalance === null ? "No disponible" : `${data.pointsBalance} puntos`}</p>
        {data.targetNights > 0 && <><label htmlFor="reward-progress">{data.currentNights} / {data.targetNights} noches hacia {data.nextTier}</label><progress id="reward-progress" max={data.targetNights} value={data.currentNights} /></>}
      </section>
      <h2>Beneficios</h2>
      {!data.benefits.length ? <p>Aún no tienes beneficios.</p> : <section className={styles.grid}>{data.benefits.map(benefit => <article key={benefit.id}>
        <h3>{benefit.title}</h3><p>{benefit.description}</p><p>{benefit.isActive ? "Activo" : "No activo"}</p>
      </article>)}</section>}
      {data.ledger !== null && <section><h2>Historial de puntos</h2>
        {!data.ledger.length ? <p>No hay movimientos de puntos.</p> : <ul>{data.ledger.map(entry => <li key={entry.id}>
          <time dateTime={entry.date}>{entry.date}</time> · {entry.type} · {entry.points} puntos · {entry.description}{entry.reservationId && ` · Reserva ${entry.reservationId}`}
        </li>)}</ul>}
      </section>}
    </>}
  </AccountSection>;
}

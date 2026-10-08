"use client";
import Link from "next/link";
import { AccountFeedback, AccountSection } from "@/modules/account";
import { usePromotions } from "../hooks/use-promotions";

export function PromotionsPage() {
  const query = usePromotions();
  return <AccountSection title="Promociones disponibles" description="Consulta vigencia, condiciones y elegibilidad. Ver una oferta no aplica descuentos a una reserva.">
    <AccountFeedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {!query.error && query.data && (query.data.length === 0 ? <p>No hay promociones disponibles para tu cuenta.</p> : query.data.map(promo => <article key={promo.code}>
      <h2>{promo.title}</h2><p>{promo.description}</p>
      <p>{promo.statusLabel ?? "Vigencia sin confirmar"} · {promo.isEligible ? "Elegible" : "No elegible"}</p>
      <p>{promo.validFrom ?? "Inicio no informado"} → {promo.validUntil ?? "Fin no informado"}</p>
      {!promo.isEligible && <p>{promo.eligibilityReason ?? "Consulta las condiciones de elegibilidad."}</p>}
      <details><summary>Ver detalle de {promo.code}</summary>
        <p>{promo.conditions}</p><p>Descuento publicado: {promo.discountPercentage}%</p>
        <p>{promo.combinable === null ? "Combinación no evaluada" : promo.combinable ? "Combinable según las condiciones recibidas" : "No combinable"}</p>
        {promo.combinationReason && <p>{promo.combinationReason}</p>}
      </details>
      {promo.isEligible && <Link href="/">Consultar disponibilidad</Link>}
    </article>))}
  </AccountSection>;
}

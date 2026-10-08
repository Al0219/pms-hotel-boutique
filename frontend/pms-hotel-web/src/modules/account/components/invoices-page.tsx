"use client";
import { AccountFeedback, AccountSection } from "./account-section";
import { useInvoices } from "../hooks/use-invoices";
export function InvoicesPage() {
  const query = useInvoices();
  return <AccountSection title="Facturas disponibles" description="Documentos asociados a tus reservas. La descarga aparece cuando el documento está disponible.">
    <AccountFeedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {!query.error && query.data && (!query.data.length ? <p>No hay documentos para tu cuenta.</p> : query.data.map(invoice => <article key={invoice.id}>
      <h2>{invoice.id}</h2><p>Reserva {invoice.reservationId} · {invoice.issuedOn} · {invoice.amountLabel}</p><p>{invoice.statusLabel}</p>
      {invoice.downloadPath ? <a href={invoice.downloadPath} download>Descargar PDF</a> : <p>Descarga no disponible.</p>}
    </article>))}
  </AccountSection>;
}

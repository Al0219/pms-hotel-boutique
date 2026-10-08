import { type CheckoutSessionSnapshot } from '@/modules/checkout/presentation/CheckoutSessionProvider';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function stayDetail(label: string, value: string): string {
  return `<div class="stay-detail"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function chargeRows(snapshot: CheckoutSessionSnapshot): string {
  return snapshot.folio.items.flatMap((item) => {
    const itemRow = `<tr class="charge-group"><td><strong>${escapeHtml(item.label)}</strong>${item.amountNature === 'ESTIMATED' ? '<span class="estimate">Estimado</span>' : ''}</td><td class="quantity">—</td><td class="amount">${escapeHtml(item.priceText)}</td></tr>`;
    const lines = item.lineItems?.map((line) => `<tr class="charge-line"><td>${escapeHtml(line.label)}</td><td class="quantity">${line.quantity === undefined ? '—' : escapeHtml(String(line.quantity))}</td><td class="amount">${escapeHtml(line.priceText)}</td></tr>`) ?? [];
    return [itemRow, ...lines];
  }).join('');
}

/** Pure session-document renderer; it deliberately makes no fiscal claim. */
export function buildInvoicePdfHtml(snapshot: CheckoutSessionSnapshot): string {
  const charges = chargeRows(snapshot);
  const total = snapshot.folio.checkoutTotal?.text ?? snapshot.folio.totalText;
  const departureNote = snapshot.departureNoteText;
  const generatedAt = snapshot.generatedAt.toLocaleString('es-GT');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #26302b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 12px; line-height: 1.55; }
    .document { width: 100%; }
    .header { align-items: flex-start; border-bottom: 2px solid #365c4b; display: flex; justify-content: space-between; padding: 0 0 18px; }
    .brand { align-items: center; display: flex; gap: 12px; }
    .monogram { align-items: center; background: #365c4b; color: #ffffff; display: flex; font-size: 17px; font-weight: 700; height: 40px; justify-content: center; letter-spacing: .08em; width: 40px; }
    .brand-name { color: #26302b; font-size: 14px; font-weight: 700; letter-spacing: .09em; margin: 0; }
    .brand-subtitle { color: #6c756f; font-size: 11px; margin: 2px 0 0; }
    .document-title { color: #365c4b; font-size: 14px; font-weight: 700; letter-spacing: .08em; line-height: 1.3; margin: 0; text-align: right; text-transform: uppercase; }
    .document-kind { color: #6c756f; font-size: 10px; letter-spacing: .06em; margin: 3px 0 0; text-align: right; text-transform: uppercase; }
    .meta { background: #f5f4ef; display: flex; gap: 28px; margin: 18px 0 24px; padding: 12px 14px; }
    .meta-label { color: #6c756f; display: block; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
    .meta-value { color: #26302b; display: block; font-weight: 600; margin-top: 2px; }
    .section { break-inside: avoid; page-break-inside: avoid; margin: 0 0 22px; }
    .section-heading { color: #365c4b; font-size: 13px; font-weight: 700; letter-spacing: .03em; margin: 0 0 10px; }
    .stay-card { background: #faf9f6; border: 1px solid #e3e3dc; display: flex; flex-wrap: wrap; padding: 4px 14px; }
    .stay-detail { border-bottom: 1px solid #e3e3dc; flex: 1 1 50%; margin: 0; min-width: 220px; padding: 10px 10px 10px 0; }
    .stay-detail:nth-last-child(-n+2) { border-bottom: 0; }
    dt { color: #6c756f; font-size: 10px; letter-spacing: .05em; text-transform: uppercase; }
    dd { color: #26302b; font-weight: 600; margin: 2px 0 0; }
    .charges { border-collapse: collapse; width: 100%; }
    .charges thead { background: #f0f1ec; }
    .charges th { color: #516158; font-size: 10px; font-weight: 700; letter-spacing: .05em; padding: 9px 10px; text-align: left; text-transform: uppercase; }
    .charges td { border-bottom: 1px solid #e3e3dc; padding: 10px; vertical-align: top; }
    .charges .quantity { color: #6c756f; text-align: center; width: 18%; }
    .charges .amount { text-align: right; white-space: nowrap; width: 24%; }
    .charge-group td { background: #fcfcfa; }
    .charge-line td:first-child { color: #515a54; padding-left: 22px; }
    .estimate { border: 1px solid #aab8ad; border-radius: 10px; color: #496854; display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .03em; margin-left: 7px; padding: 1px 6px; text-transform: uppercase; }
    .empty-charges { color: #6c756f; margin: 0; }
    .total-box { border-top: 2px solid #365c4b; display: flex; justify-content: flex-end; margin-left: auto; margin-top: 14px; padding: 11px 0 0; width: 45%; }
    .total-label { color: #6c756f; margin-right: 16px; padding-top: 2px; }
    .total-value { color: #365c4b; font-size: 16px; font-weight: 700; text-align: right; }
    .note { background: #faf9f6; border-left: 3px solid #8a9c8f; color: #48524c; margin: 0; padding: 11px 13px; }
    .notice { border-top: 1px solid #e3e3dc; color: #6c756f; font-size: 10px; margin-top: 30px; padding-top: 14px; }
    .notice strong { color: #48524c; display: block; font-size: 10px; margin-bottom: 3px; }
    .footer { color: #8a918c; font-size: 9px; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">
        <div class="monogram">HB</div>
        <div>
          <p class="brand-name">HOTEL BOUTIQUE</p>
          <p class="brand-subtitle">Resumen para huésped</p>
        </div>
      </div>
      <div>
        <h1 class="document-title">Resumen de estancia</h1>
        <p class="document-kind">Documento de sesión</p>
      </div>
    </header>

    <section class="meta" aria-label="Referencia del documento">
      <div><span class="meta-label">Referencia</span><span class="meta-value">${escapeHtml(snapshot.referenceText)}</span></div>
      <div><span class="meta-label">Generado</span><span class="meta-value">${escapeHtml(generatedAt)}</span></div>
    </section>

    <section class="section">
      <h2 class="section-heading">Detalles de la estancia</h2>
      <dl class="stay-card">
        ${stayDetail('Habitación', snapshot.content.roomDisplayText)}
        ${stayDetail('Fechas de estancia', snapshot.content.stayDatesText)}
        ${stayDetail('Salida prevista', snapshot.content.expectedDepartureText)}
      </dl>
    </section>

    <section class="section">
      <h2 class="section-heading">Detalle de cargos</h2>
      ${charges ? `<table class="charges"><thead><tr><th>Descripción</th><th class="quantity">Cantidad</th><th class="amount">Importe</th></tr></thead><tbody>${charges}</tbody></table>` : '<p class="empty-charges">Sin cargos registrados en esta sesión.</p>'}
      <div class="total-box"><span class="total-label">Total</span><strong class="total-value">${escapeHtml(total)}</strong></div>
    </section>

    ${departureNote ? `<section class="section"><h2 class="section-heading">Notas</h2><p class="note">${escapeHtml(departureNote)}</p></section>` : ''}

    <section class="notice">
      <strong>Información importante</strong>
      Este documento es un resumen de estancia generado por la aplicación.<br />
      No constituye comprobante fiscal FEL ni documento certificado por SAT.
    </section>

    <footer class="footer">Hotel Boutique · PMS<br />Documento generado desde la aplicación del huésped.</footer>
  </main>
</body>
</html>`;
}

export { escapeHtml };

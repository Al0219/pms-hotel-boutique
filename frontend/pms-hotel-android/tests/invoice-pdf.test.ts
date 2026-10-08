import { buildInvoicePdfHtml } from '@/modules/checkout';

const snapshot = {
  referenceText: 'CHK-1',
  generatedAt: new Date(2026, 8, 18, 11, 30),
  departureNoteText: '<script>x</script>',
  content: { roomDisplayText: 'Habitación 204', stayDatesText: '28 ago – 18 sept', expectedDepartureText: 'Salida 12:00', departureNoteText: '', checks: [] },
  folio: {
    totalStayText: '',
    paidGuaranteeText: '',
    pendingBalanceText: '',
    totalText: 'Total · Q 120',
    checkoutTotal: { amountMinor: 12000, currency: 'GTQ' as const, text: 'Total · Q 120' },
    items: [{ key: 'transfer', label: 'Traslado', priceText: 'Q 100', amountNature: 'ESTIMATED' as const, lineItems: [{ label: 'Aeropuerto', quantity: 2, priceText: 'Q 50' }] }],
  },
};

describe('buildInvoicePdfHtml', () => {
  it('renders the professional stay summary from the frozen session snapshot', () => {
    const html = buildInvoicePdfHtml(snapshot);

    for (const value of [
      '<!DOCTYPE html>',
      'Resumen de estancia',
      'Hotel Boutique',
      'Detalles de la estancia',
      'Detalle de cargos',
      'Total',
      'Información importante',
      'No constituye comprobante fiscal FEL ni documento certificado por SAT.',
      'CHK-1',
      'Habitación 204',
      '28 ago – 18 sept',
      'Salida 12:00',
      'Traslado',
      'Aeropuerto',
      'Q 50',
      'Total · Q 120',
      'Estimado',
      '&lt;script&gt;x&lt;/script&gt;',
    ]) expect(html).toContain(value);
    expect(html).toContain('<table class="charges">');
    expect(html).not.toContain('<script>x</script>');
  });

  it('escapes every HTML-sensitive character from snapshot text', () => {
    const unsafe = `R & < > " '`;
    const html = buildInvoicePdfHtml({
      ...snapshot,
      referenceText: unsafe,
      departureNoteText: unsafe,
      folio: { ...snapshot.folio, items: [{ key: 'special', label: unsafe, priceText: unsafe, amountNature: 'CONFIRMED' }] },
    });

    expect(html).toContain('R &amp; &lt; &gt; &quot; &#39;');
    expect(html).toContain('R &amp; &lt; &gt; &quot; &#39;');
    expect(html).not.toContain(unsafe);
  });
});

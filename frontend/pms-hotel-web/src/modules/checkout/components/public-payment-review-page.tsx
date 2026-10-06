'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookingStepper, PublicCurrencySelector, displayMoney, publicGuestDataHref, publicSelectionHref, usePublicBookingReview, usePublicDisplayCurrency, type BookingSearchCriteria } from '@/modules/booking';
import { DemoCardGateway, type DemoCardToken } from '@/modules/payments';
import { useGuestSession } from '@/modules/auth';
import { getPublicEnvironment } from '@/lib/env';
import { Button, EmptyState } from '@/shared/components';
import { validateGuest, internationalPhone } from '../domain/guest-details';
import { paymentEstimate, quoteFingerprint } from '../domain/payment-estimate';
import { publicCheckoutReviewHref } from '../domain/checkout-navigation';
import { useCheckoutDraft } from './checkout-draft-provider';
import { CheckoutAvailabilityGate } from './checkout-availability-gate';
import { confirmationHref, useDemoCheckout } from '../hooks/use-demo-checkout';
import { chosenPayment } from '../domain/payment-choice';
import { PaymentModeSelector } from './payment-mode-selector';
import styles from './public-payment-review-page.module.css';

export function PublicPaymentReviewPage({ initialCriteria: criteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const review = usePublicBookingReview(criteria);
  const draft = useCheckoutDraft(review.scope);
  const { account } = useGuestSession();
  const currency = usePublicDisplayCurrency();
  const holderName = `${draft.guest.firstName.trim()} ${draft.guest.lastName.trim()}`.trim();
  const [selectedCard, setSelectedCard] = useState<{ scope: string; holderName: string; card: DemoCardToken | null } | null>(null);
  const card = selectedCard?.scope === review.scope && selectedCard.holderName === holderName ? selectedCard.card : draft.failure?.card.holderName === holderName ? draft.failure.card : { token: 'demo_visa_approved', brand: 'Visa' as const, last4: '4242', holderName };
  const checkout = useDemoCheckout(review, criteria, card);
  const valid = draft.approvedSelection === review.selectionKey && !Object.keys(validateGuest(draft.guest)).length;
  const nights = review.availability.data?.totalNights ?? 0;
  const reviewed = draft.reviewedQuote === quoteFingerprint(review.items, nights);
  const estimate = paymentEstimate(review.items, nights);
  const quote = quoteFingerprint(review.items, nights);
  const choice = draft.paymentChoice(quote);
  const payment = estimate ? chosenPayment(estimate.totalMinor, estimate.guaranteeMinor, choice) : null;
  const locked = checkout.isPending || draft.hasUnresolvedAttempt;
  const roomCount = review.items.reduce((count, item) => count + item.quantity, 0);
  const money = (minor: number) => displayMoney(minor / 100, estimate!.currency, currency);
  const dates = (value: string) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  return <div className={styles.page}>
    <div className={styles.topBar}><Link className={styles.back} href={publicCheckoutReviewHref(criteria)}>← Volver a revisión</Link><PublicCurrencySelector id="payment-display-currency" /></div>
    <header><p className={styles.eyebrow}>{account ? 'CHECKOUT · PASO 4' : 'CHECKOUT COMO INVITADO · PASO 4'}</p><h1>Pago y garantía</h1><p>El inicio de sesión sigue siendo opcional. La garantía aplica a esta reserva de {roomCount} {roomCount === 1 ? 'habitación' : 'habitaciones'}.</p></header>
    <BookingStepper step={4} />
    <p className={styles.demo}>Modo demostración · Sin cobros, correos ni reservas reales. No ingreses datos de una tarjeta real.</p>
    <CheckoutAvailabilityGate review={review}>{!valid ? <><EmptyState title="Completa tus datos antes de continuar" description="Necesitamos la información válida de la persona responsable para esta selección."/><Link className={styles.back} href={publicGuestDataHref(criteria)}>Completar mis datos →</Link></> : draft.confirmation ? <section className={styles.card}><h2>Ya completaste esta demostración</h2><p>La referencia es {draft.confirmation.reservationId}. Volver a esta pantalla no repite la garantía.</p><Link className={styles.back} href={confirmationHref(criteria)}>Ver confirmación →</Link></section> : !reviewed ? <>{checkout.error && <p className={styles.error} role="alert">{checkout.error}</p>}<EmptyState title="Revisa tu reserva antes de continuar" description="Comprueba los datos y la cotización vigente en el Paso 3 antes de pasar al pago."/><Link className={styles.back} href={publicCheckoutReviewHref(criteria)}>Revisar mi reserva →</Link></> : <div className={styles.layout}>
      <div className={styles.left}><section className={styles.card} aria-labelledby="guarantee-title"><h2 id="guarantee-title">Pago y garantía de la reserva</h2><p className={styles.muted}>Tú eliges cuánto abonar hoy. Revisa la modalidad y la tarjeta antes de confirmar.</p>
        {estimate && <PaymentModeSelector totalMinor={estimate.totalMinor} minimumMinor={estimate.guaranteeMinor} currency={estimate.currency} displayCurrency={currency} choice={choice} disabled={locked || !getPublicEnvironment().useMockApi} onChange={value => { draft.setPayment(quote, value); checkout.clearError(); }}/>}
        {draft.failure?.outcomeUnknown && <p className={styles.demo}>Reintenta con la misma tarjeta de prueba para verificar la solicitud anterior. Podrás modificarla después de conocer el resultado.</p>}
        {getPublicEnvironment().useMockApi ? <DemoCardGateway key={`${review.scope}:${holderName}`} holderName={holderName} card={card} disabled={locked} onChange={value => { setSelectedCard({ scope: review.scope, holderName, card: value }); checkout.clearError(); }} /> : <p className={styles.demo}>La pasarela real todavía no está conectada. Esta pantalla permite confirmar únicamente en modo demostración.</p>}
        <div className={styles.contact}><h3>Responsable de la reserva</h3><strong>{holderName}</strong><span>{draft.guest.email.trim()}</span><span>{internationalPhone(draft.guest)}</span>{draft.guest.specialRequests.trim() && <p>{draft.guest.specialRequests}</p>}<Link className={styles.back} href={publicGuestDataHref(criteria)}>Editar mis datos</Link></div>
      </section><section className={styles.trust} aria-label="Información de seguridad"><div><span aria-hidden="true">◇</span><strong>PSP con tokenización</strong><small>Certificación PCI-DSS del proveedor real pendiente</small></div><div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><strong>Datos aislados</strong><small>Sin envío de número de tarjeta ni CVV al PMS</small></div></section>
        <section className={styles.policy} aria-labelledby="payment-policy-title"><h3 id="payment-policy-title">Condiciones de cancelación</h3>{review.items.map(item => <p key={item.roomTypeId}><strong>{item.room?.name}</strong><br/>{item.rate?.cancellationPolicy}</p>)}<small>Se aplica la política de cada tarifa, en la hora local del hotel. Las condiciones mostradas son de demostración.</small></section>
      </div><aside className={styles.summary} aria-labelledby="payment-summary-title"><h2 id="payment-summary-title">Resumen de la reserva</h2><ul className={styles.rooms}>{review.items.map(item => <li key={item.roomTypeId}><div><strong>{item.room?.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</strong><span>{item.rate?.name}</span></div><b>{item.rate?.priceBreakdown ? displayMoney(item.rate.priceBreakdown.estimatedTotal * item.quantity, item.rate.currency, currency) : 'Por confirmar'}</b></li>)}</ul>
        <p className={styles.stay}>{roomCount} {roomCount === 1 ? 'habitación' : 'habitaciones'} · {criteria.adults} {criteria.adults === 1 ? 'adulto' : 'adultos'}{criteria.children ? ` · ${criteria.children} niños` : ''}<br/>{dates(criteria.checkIn!)} → {dates(criteria.checkOut!)} · {nights} {nights === 1 ? 'noche' : 'noches'}</p>
        {estimate ? <><dl className={styles.amounts} aria-live="polite"><div><dt>Total estimado</dt><dd>{money(estimate.totalMinor)}</dd></div><div className={styles.today}><dt>Monto a cobrar hoy <small>{choice.mode === 'full' ? 'Pago total' : choice.preset === 'night' ? 'Una noche de garantía' : choice.preset === 'half' ? '50% de la estadía' : 'Garantía personalizada'} · Simulado</small></dt><dd>{payment?.amountMinor != null ? money(payment.amountMinor) : 'Por definir'}</dd></div><div><dt>Restante en check-in</dt><dd>{payment?.amountMinor != null ? money(estimate.totalMinor - payment.amountMinor) : 'Por definir'}</dd></div></dl><p className={styles.note}>Incluye impuestos y cargos estimados. Estas modalidades son ejemplos; la política productiva del hotel está pendiente.</p>{currency !== estimate.currency && <p className={styles.note}>Conversión referencial. El abono se simula en {estimate.currency}.</p>}</> : <p className={styles.error}>La cotización está incompleta o mezcla monedas. No podemos confirmar la garantía.</p>}
        <span className={styles.accountBadge}>✓ Cuenta no requerida</span>
        {checkout.error && <p className={styles.error} role="alert">{checkout.error}</p>}
        <Button className={styles.confirm} type="button" disabled={!estimate || payment?.amountMinor == null || !card || !valid || !getPublicEnvironment().useMockApi || checkout.phase === 'done'} isLoading={checkout.isPending} loadingText={checkout.phase === 'checking' ? 'Verificando disponibilidad…' : 'Procesando garantía de prueba…'} onClick={() => void checkout.submit()}>{choice.mode === 'full' ? 'Pagar y confirmar reserva' : 'Garantizar y confirmar reserva'}</Button>
        <p className={styles.note}>No se realizará ningún débito real. Confirmamos solo después de verificar la respuesta del simulador.</p><p className={styles.securityNote}>♧ Datos de tarjeta aislados · La cancelación depende de la tarifa seleccionada. Encriptación y certificación del PSP real pendientes.</p><Link className={styles.back} href={publicSelectionHref(criteria)}>Revisar mi selección</Link>
      </aside>
    </div>}</CheckoutAvailabilityGate>
  </div>;
}

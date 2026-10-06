'use client';

import { useId, useState } from 'react';
import { convertCurrencyMinor, displayMoney, type usePublicDisplayCurrency } from '@/modules/booking';
import { chosenPayment, type PaymentChoice } from '../domain/payment-choice';
import styles from './payment-mode-selector.module.css';

// No approved public property policy/response supports payment at reception yet.
const demoPolicy = { allowPayAtHotel: false, reason: 'Pendiente de habilitación por la propiedad en este recorrido de demostración.' };

export function PaymentModeSelector({ totalMinor, minimumMinor, currency, displayCurrency, choice, onChange, disabled }: {
  totalMinor: number; minimumMinor: number; currency: string; displayCurrency: ReturnType<typeof usePublicDisplayCurrency>;
  choice: PaymentChoice; onChange: (choice: PaymentChoice) => void; disabled: boolean;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const inputCurrency = choice.customCurrency ?? (choice.customAmount && (currency === 'USD' || currency === 'GTQ') ? currency : displayCurrency);
  const payment = chosenPayment(totalMinor, minimumMinor, { ...choice, customCurrency: inputCurrency }, currency);
  const money = (minor: number) => displayMoney(minor / 100, currency, displayCurrency);
  const minimumInput = convertCurrencyMinor(minimumMinor, currency, inputCurrency)!;
  function changeInputCurrency(target: 'USD' | 'GTQ') {
    const converted = payment.amountMinor === null ? null : convertCurrencyMinor(payment.amountMinor, currency, target);
    onChange({ ...choice, customCurrency: target, customAmount: converted === null ? '' : (converted / 100).toFixed(2), customQuotedMinor: payment.amountMinor ?? undefined });
  }
  const halfTooLow = Math.round(totalMinor / 2) < minimumMinor;
  const error = touched && choice.mode === 'partial' && choice.preset === 'custom' ? payment.error : '';
  return <fieldset className={styles.fieldset} disabled={disabled}>
    <legend>¿Cómo prefieres pagar?</legend>
    <p className={styles.intro}>Elige el monto de este recorrido. No se realizará ningún cobro real.</p>
    <label className={`${styles.option} ${choice.mode === 'full' ? styles.active : ''}`}>
      <input type="radio" name={`${id}-mode`} value="full" checked={choice.mode === 'full'} onChange={() => onChange({ ...choice, mode: 'full' })}/>
      <span><strong>Pagar ahora</strong><small>Se realizará el cargo completo para confirmar tu reserva hoy.</small></span><b>{money(totalMinor)}</b>
    </label>
    <div className={`${styles.partial} ${choice.mode === 'partial' ? styles.active : ''}`}>
      <label className={styles.option}><input type="radio" name={`${id}-mode`} value="partial" checked={choice.mode === 'partial'} onChange={() => onChange({ ...choice, mode: 'partial' })}/><span><strong>Garantizar con tarjeta</strong><small>Asocia tu tarjeta como garantía o realiza un abono parcial.</small></span></label>
      {choice.mode === 'partial' && <div className={styles.deposit}>
        <p>En esta demo, la garantía representa un abono simulado.</p>
        <div className={styles.presets} role="group" aria-label="Monto de la garantía">
          <button type="button" aria-pressed={choice.preset === 'night'} onClick={() => onChange({ ...choice, preset: 'night' })}>1 noche <span>{money(minimumMinor)}</span></button>
          <button type="button" aria-pressed={choice.preset === 'half'} disabled={halfTooLow} title={halfTooLow ? 'El mínimo de esta estadía es el total de una noche' : undefined} onClick={() => onChange({ ...choice, preset: 'half' })}>50% de la estadía <span>{money(Math.round(totalMinor / 2))}</span></button>
          <button type="button" aria-pressed={choice.preset === 'custom'} onClick={() => onChange({ ...choice, preset: 'custom', customCurrency: inputCurrency })}>Personalizado</button>
        </div>
        {choice.preset === 'custom' && <div className={styles.custom}>
          <div className={styles.amountHeader}><label htmlFor={`${id}-amount`}>Monto a garantizar ({inputCurrency})</label><label htmlFor={`${id}-input-currency`} className={styles.currencyLabel}>Moneda del monto<select id={`${id}-input-currency`} value={inputCurrency} onChange={event => changeInputCurrency(event.target.value === 'GTQ' ? 'GTQ' : 'USD')}><option value="GTQ">Q · Quetzales</option><option value="USD">US$ · Dólares</option></select></label></div>
          <input id={`${id}-amount`} type="text" inputMode="decimal" autoComplete="off" value={choice.customAmount} aria-invalid={Boolean(error)} aria-describedby={`${id}-limits${error ? ` ${id}-error` : ''}`} placeholder={(minimumInput / 100).toFixed(2)} onBlur={() => setTouched(true)} onChange={event => { setTouched(true); onChange({ ...choice, customCurrency: inputCurrency, customAmount: event.target.value, customQuotedMinor: undefined }); }}/>
          <small id={`${id}-limits`}>Mínimo {displayMoney(minimumMinor / 100, currency, inputCurrency)} · Máximo {displayMoney(totalMinor / 100, currency, inputCurrency)}. Al cambiar la moneda del monto convertimos el valor ingresado.</small>
          {minimumMinor === totalMinor && <small>Para una estadía de una noche, la garantía mínima equivale al total.</small>}
          {inputCurrency !== currency && <small>Conversión referencial. {payment.amountMinor !== null ? `Equivalente del abono: ${displayMoney(payment.amountMinor / 100, currency, currency === 'GTQ' ? 'GTQ' : 'USD')}.` : ''} La cotización y el abono simulado se procesan en {currency}.</small>}
          {error && <p id={`${id}-error`} className={styles.error} role="alert">⚠ {error}</p>}
        </div>}
      </div>}
    </div>
    <label className={`${styles.option} ${styles.unavailable}`}><input type="radio" name={`${id}-mode`} disabled={!demoPolicy.allowPayAtHotel} checked={false} readOnly aria-describedby={`${id}-hotel-policy`}/><span><strong>Pagar en el hotel <em>No disponible</em></strong><small>Sin cobro inmediato. Paga directamente durante tu check-in en recepción.</small><small id={`${id}-hotel-policy`}>{demoPolicy.reason}</small></span></label>
  </fieldset>;
}

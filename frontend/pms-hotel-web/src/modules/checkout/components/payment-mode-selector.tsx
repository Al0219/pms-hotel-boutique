'use client';

import { useId, useState } from 'react';
import { displayMoney, type usePublicDisplayCurrency } from '@/modules/booking';
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
  const payment = chosenPayment(totalMinor, minimumMinor, choice);
  const money = (minor: number) => displayMoney(minor / 100, currency, displayCurrency);
  const baseMoney = (minor: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency }).format(minor / 100);
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
          <button type="button" aria-pressed={choice.preset === 'custom'} onClick={() => onChange({ ...choice, preset: 'custom' })}>Personalizado</button>
        </div>
        {choice.preset === 'custom' && <div className={styles.custom}>
          <label htmlFor={`${id}-amount`}>Monto a garantizar ({currency})</label>
          <input id={`${id}-amount`} type="text" inputMode="decimal" autoComplete="off" value={choice.customAmount} aria-invalid={Boolean(error)} aria-describedby={`${id}-limits${error ? ` ${id}-error` : ''}`} placeholder={(minimumMinor / 100).toFixed(2)} onBlur={() => setTouched(true)} onChange={event => { setTouched(true); onChange({ ...choice, customAmount: event.target.value }); }}/>
          <small id={`${id}-limits`}>Mínimo {baseMoney(minimumMinor)} · Máximo {baseMoney(totalMinor)}. Ingresa el importe en {currency}; cambiar la moneda de visualización no lo convierte.</small>
          {error && <p id={`${id}-error`} className={styles.error} role="alert">⚠ {error}</p>}
        </div>}
      </div>}
    </div>
    <label className={`${styles.option} ${styles.unavailable}`}><input type="radio" name={`${id}-mode`} disabled={!demoPolicy.allowPayAtHotel} checked={false} readOnly aria-describedby={`${id}-hotel-policy`}/><span><strong>Pagar en el hotel <em>No disponible</em></strong><small>Sin cobro inmediato. Paga directamente durante tu check-in en recepción.</small><small id={`${id}-hotel-policy`}>{demoPolicy.reason}</small></span></label>
  </fieldset>;
}

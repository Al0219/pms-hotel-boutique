'use client';

import { usePublicBookingSession } from '../components/public-booking-provider';
import { publicCurrencyReference } from '../content/public-currency-reference';
import styles from './public-currency-selector.module.css';

export function PublicCurrencySelector({ id = 'public-display-currency', quotedCurrency }: { id?: string; quotedCurrency?: string }) {
  const { currency, setCurrency } = usePublicBookingSession();
  if (quotedCurrency) return <p className={styles.control}>Precios en {quotedCurrency}{quotedCurrency === 'GTQ' ? ' · Quetzales' : ''}</p>;
  return <div className={styles.control}><label htmlFor={id}>Mostrar precios en</label>
    <select id={id} value={currency} onChange={event => setCurrency(event.target.value === 'GTQ' ? 'GTQ' : 'USD')}>
      <option value="GTQ">GTQ · Quetzales</option><option value="USD">USD · Dólares</option>
    </select>
    {currency === 'GTQ' && <small>Conversión indicativa: US$1 = Q {publicCurrencyReference.rate}. Referencia {publicCurrencyReference.asOf} · <a href={publicCurrencyReference.url} target="_blank" rel="noopener noreferrer">Banguat</a>. La cotización original conserva su moneda; cada importe se redondea por separado.</small>}
  </div>;
}

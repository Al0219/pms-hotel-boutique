import type { AvailableRoomType } from '@/modules/availability';
import type { CatalogueFilters } from '../domain/room-catalogue';
import { displayMoney } from '../domain/display-currency';
import styles from './public-availability-page.module.css';

export function NightlyPriceRange({ rooms, filters, onChange }: { rooms: AvailableRoomType[]; filters: CatalogueFilters; onChange: (filters: CatalogueFilters) => void }) {
  const prices = rooms.flatMap(room => room.ratePlans.flatMap(rate => rate.nightlyRateMinor === undefined ? [] : [rate.nightlyRateMinor]));
  if (!prices.length) return <p>No hay tarifas disponibles para filtrar.</p>;
  const lower = Math.min(...prices), upper = Math.max(...prices);
  const maximum = Math.max(lower, Math.min(upper, filters.maxNightlyMinor ?? upper));
  const minimum = Math.min(maximum, Math.max(lower, filters.minNightlyMinor ?? lower));
  const money = (minor: number) => displayMoney(minor / 100, 'GTQ', 'GTQ');
  return <div className={styles.priceRange}>
    <div className={styles.rangeValues} aria-live="polite"><span>{money(minimum)}</span><span>{money(maximum)}</span></div>
    <label htmlFor="nightly-minimum">Precio mínimo por noche</label>
    <label htmlFor="nightly-maximum">Precio máximo por noche</label>
    <div className={styles.rangeTrack}>
    <input id="nightly-minimum" type="range" min={lower} max={upper} step={1} value={minimum} disabled={lower === upper} aria-valuetext={money(minimum)} onChange={event => onChange({ ...filters, minNightlyMinor: Math.min(Number(event.target.value), maximum), maxNightlyMinor: maximum })} />
    <input id="nightly-maximum" type="range" min={lower} max={upper} step={1} value={maximum} disabled={lower === upper} aria-valuetext={money(maximum)} onChange={event => onChange({ ...filters, minNightlyMinor: minimum, maxNightlyMinor: Math.max(Number(event.target.value), minimum) })} />
    </div>
  </div>;
}

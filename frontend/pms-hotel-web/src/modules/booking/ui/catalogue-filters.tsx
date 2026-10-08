import { NightlyPriceRange } from './nightly-price-range';
import type { AvailableRoomType } from '@/modules/availability';
import type { CatalogueFilters } from "../domain/room-catalogue";
import { usePublicDisplayCurrency } from '../components/public-booking-provider';
import { displayMoney } from '../domain/display-currency';
import styles from "./public-availability-page.module.css";
import { getPublicEnvironment } from '@/lib/env';

export function CatalogueFilterPanel({ rooms = [], filters, onChange, onClear }: {
  rooms?: AvailableRoomType[]; filters: CatalogueFilters; onChange: (value: CatalogueFilters) => void; onClear: () => void;
}) {
  const currency = usePublicDisplayCurrency();
  if (!getPublicEnvironment().useMockApi) return <aside className={styles.filters} aria-labelledby="filter-title">
    <div className={styles.filterHeading}><h2 id="filter-title">Filtros</h2><button type="button" onClick={onClear}>Limpiar filtros</button></div>
    <fieldset><legend>Tipo de habitación</legend>{[...new Set(rooms.map(room => room.code))].sort().map(code =>
      <label key={code}><input type="checkbox" checked={filters.codes?.includes(code) ?? false} onChange={event => onChange({ ...filters,
        codes: event.target.checked ? [...(filters.codes ?? []), code] : filters.codes?.filter(value => value !== code),
      })} />{code}</label>)}</fieldset>
    <fieldset><legend>Precio por noche</legend><NightlyPriceRange rooms={rooms} filters={filters} onChange={onChange} />
    </fieldset>
  </aside>;
  const money = (amount: number) => displayMoney(amount, 'USD', currency);
  return <aside className={styles.filters} aria-labelledby="filter-title">
    <div className={styles.filterHeading}><h2 id="filter-title">Filtrar resultados</h2><button type="button" onClick={onClear}>Limpiar filtros</button></div>
    <fieldset><legend>Tipo de habitación</legend>{([['DELUXE', 'Deluxe'], ['SUITE', 'Suite'], ['SUPERIOR', 'Superior']] as const).map(([value, label]) =>
      <label key={value}><input type="checkbox" checked={filters.categories.includes(value)} onChange={event => onChange({ ...filters,
        categories: event.target.checked ? [...filters.categories, value] : filters.categories.filter(item => item !== value),
      })} />{label}</label>)}</fieldset>
    <fieldset><legend>Capacidad</legend><div className={styles.capacity}>{[1, 2, 3, 4].map(value =>
      <button key={value} type="button" aria-pressed={filters.capacity === value} onClick={() => onChange({ ...filters, capacity: value })}>{value}+</button>)}</div></fieldset>
    <fieldset><legend>Precio por noche</legend>{([['low', `Hasta ${money(150)}`], ['middle', `${money(150)}–${money(180)}`], ['high', `Más de ${money(180)}`]] as const).map(([value, label]) =>
      <label key={value}><input type="checkbox" checked={filters.prices.includes(value)} onChange={event => onChange({ ...filters,
        prices: event.target.checked ? [...filters.prices, value] : filters.prices.filter(item => item !== value),
      })} />{label}</label>)}</fieldset>
    <p className={styles.small}>Rangos equivalentes de las tarifas cotizadas en USD{currency === 'GTQ' ? ', mostrados en quetzales' : ''}.</p>
  </aside>;
}

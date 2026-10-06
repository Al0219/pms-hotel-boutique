import type { CatalogueFilters } from "../domain/room-catalogue";
import { usePublicDisplayCurrency } from '../components/public-booking-provider';
import { displayMoney } from '../domain/display-currency';
import styles from "./public-availability-page.module.css";

export function CatalogueFilterPanel({ filters, onChange, onClear }: {
  filters: CatalogueFilters; onChange: (value: CatalogueFilters) => void; onClear: () => void;
}) {
  const currency = usePublicDisplayCurrency();
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

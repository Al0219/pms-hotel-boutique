import type { CatalogueFilters } from "../domain/room-catalogue";
import styles from "./public-availability-page.module.css";

export function CatalogueFilterPanel({ filters, onChange, onClear }: {
  filters: CatalogueFilters; onChange: (value: CatalogueFilters) => void; onClear: () => void;
}) {
  return <aside className={styles.filters} aria-labelledby="filter-title">
    <div className={styles.filterHeading}><h2 id="filter-title">Filtrar resultados</h2><button type="button" onClick={onClear}>Limpiar filtros</button></div>
    <fieldset><legend>Tipo de habitación</legend>{([['DELUXE', 'Deluxe'], ['SUITE', 'Suite'], ['SUPERIOR', 'Superior']] as const).map(([value, label]) =>
      <label key={value}><input type="checkbox" checked={filters.categories.includes(value)} onChange={event => onChange({ ...filters,
        categories: event.target.checked ? [...filters.categories, value] : filters.categories.filter(item => item !== value),
      })} />{label}</label>)}</fieldset>
    <fieldset><legend>Capacidad</legend><div className={styles.capacity}>{[1, 2, 3, 4].map(value =>
      <button key={value} type="button" aria-pressed={filters.capacity === value} onClick={() => onChange({ ...filters, capacity: value })}>{value}+</button>)}</div></fieldset>
    <fieldset><legend>Precio por noche</legend>{([['low', 'Hasta US$150'], ['middle', 'US$151–180'], ['high', 'US$181+']] as const).map(([value, label]) =>
      <label key={value}><input type="checkbox" checked={filters.prices.includes(value)} onChange={event => onChange({ ...filters,
        prices: event.target.checked ? [...filters.prices, value] : filters.prices.filter(item => item !== value),
      })} />{label}</label>)}</fieldset>
    <p className={styles.small}>Los rangos de precio se aplican a tarifas en USD.</p>
  </aside>;
}

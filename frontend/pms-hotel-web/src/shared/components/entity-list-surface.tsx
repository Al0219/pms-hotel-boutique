import type { ReactNode } from 'react';
import styles from './entity-workspace.module.css';

/** Reservations' visual frame. Controls, data and row actions remain owned by each module. */
export const ENTITY_LIST_TABLE_MIN_WIDTH = 940;
export function EntityListSurface({ label, filters, filterActions, filterColumns = 3, supportingFilters, filterFeedback, secondary, children, footer, showScrollHint = true }: {
  label: string; filters: ReactNode; filterActions?: ReactNode; supportingFilters?: ReactNode; filterFeedback?: ReactNode;
  filterColumns?: 3 | 4; secondary?: ReactNode; children: ReactNode; footer?: ReactNode; showScrollHint?: boolean;
}) {
  return <section className={styles.listSurface} aria-label={label}>
    <div className={styles.filters}>
      <div className={`${styles.filterGrid} ${filterColumns === 4 ? styles.filterGridExpanded : ''}`}>{filters}<div className={styles.filterActions}>{filterActions}</div></div>
      {supportingFilters && <div className={styles.filterGrid}>{supportingFilters}</div>}
      {filterFeedback}
    </div>
    {secondary && <div className={styles.secondaryRail}>{secondary}</div>}
    <div className={styles.tableRegion}>
      {showScrollHint && <p className={styles.scrollHint}>Desliza la tabla para ver todos los detalles y acciones.</p>}
      {children}
    </div>
    {footer}
  </section>;
}

export function EntityListFooter({ summary, actions, navigationLabel, live }: {
  summary: ReactNode; actions?: ReactNode; navigationLabel?: string; live?: 'polite';
}) {
  const Tag = navigationLabel ? 'nav' : 'div';
  return <Tag className={styles.resultsFooter} aria-label={navigationLabel}>
    <p className={styles.resultsSummary} aria-live={live}>{summary}</p>
    {actions}
  </Tag>;
}

export function EntityFilterField({ label, search = false, column, children }: { label: string; search?: boolean; column?: 2 | 3; children: ReactNode }) {
  return <label className={`${search ? styles.searchField : styles.field}${column ? ` ${styles[`filterColumn${column}`]}` : ''}`}>
    <span>{label}</span>
    {search ? <span className={styles.searchControl}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
      {children}
    </span> : children}
  </label>;
}

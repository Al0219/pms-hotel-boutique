'use client';

import { useState } from 'react';
import { EntityListFooter } from './entity-list-surface';
import styles from './entity-workspace.module.css';

export const ENTITY_PAGE_SIZES = [5, 10, 25, 50, 100] as const;

interface PaginationState {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/** Receives already filtered rows. Scope/filter changes reset before rendering a new page. */
export function useEntityPagination<T>(items: ReadonlyArray<T>, resetKey: string) {
  const [state, setState] = useState({ resetKey, page: 1, pageSize: 25 });
  const pageCount = Math.max(1, Math.ceil(items.length / state.pageSize));
  const page = state.resetKey === resetKey ? Math.min(state.page, pageCount) : 1;
  if (state.resetKey !== resetKey || state.page !== page) {
    setState({ ...state, resetKey, page });
  }
  const offset = (page - 1) * state.pageSize;
  return {
    page, pageSize: state.pageSize, pageCount, total: items.length,
    from: items.length ? offset + 1 : 0,
    to: Math.min(offset + state.pageSize, items.length),
    rows: items.slice(offset, offset + state.pageSize),
    setPage: (next: number) => setState(previous => ({ ...previous, page: Math.max(1, Math.min(next, pageCount)) })),
    setPageSize: (size: number) => {
      if (ENTITY_PAGE_SIZES.some(value => value === size)) setState(previous => ({ ...previous, pageSize: size, page: 1 }));
    },
  };
}

function pageNumbers(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 6) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: Array<number | 'ellipsis'> = [1];
  if (current > 3) pages.push('ellipsis');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) pages.push(page);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function EntityPagination({ pagination, label, noun }: {
  pagination: PaginationState; label: string; noun: string;
}) {
  const { page, pageSize, pageCount, from, to, total, setPage, setPageSize } = pagination;
  return <EntityListFooter navigationLabel={label} live="polite" summary={`${from}–${to} de ${total} ${noun}`} actions={
    <div className={styles.paginationControls}>
      <label className={styles.pageSizeField}>Filas por página
        <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
          {ENTITY_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <div className={styles.pager}>
        <button type="button" className={styles.pageButton} aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
        {pageNumbers(page, pageCount).map((entry, index) => entry === 'ellipsis'
          ? <span key={`ellipsis-${index}`} className={styles.pageEllipsis} aria-hidden="true">…</span>
          : <button key={entry} type="button" className={`${styles.pageButton} ${entry === page ? styles.pageButtonActive : ''}`}
            aria-label={`Página ${entry}`} aria-current={entry === page ? 'page' : undefined} onClick={() => setPage(entry)}>{entry}</button>)}
        <button type="button" className={styles.pageButton} aria-label="Página siguiente" disabled={page === pageCount} onClick={() => setPage(page + 1)}>›</button>
      </div>
    </div>
  } />;
}

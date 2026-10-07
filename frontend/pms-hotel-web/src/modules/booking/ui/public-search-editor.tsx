'use client';

import { useEffect, useRef } from 'react';
import { PublicSearchForm, type PublicSearchFormProps } from './public-search-form';

/** The same editable search in results and detail; opening brings dates into view. */
export function PublicSearchEditor({ visible, ...props }: PublicSearchFormProps & { visible: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const input = panel.current?.querySelector<HTMLInputElement>('input[type="date"]');
    input?.focus({ preventScroll: true });
    panel.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [visible]);
  return <div ref={panel} hidden={!visible} role="region" aria-label="Editor de búsqueda">
    <PublicSearchForm {...props} />
  </div>;
}

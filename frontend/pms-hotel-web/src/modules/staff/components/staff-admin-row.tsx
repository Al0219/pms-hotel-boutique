'use client';
import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { StaffRowPanelContext } from './staff-row-panel-context';
import styles from './staff-admin.module.css';

const controls = 'input, select, textarea, button, a, [role="button"], [role="slider"], [contenteditable], [data-staff-row-action]';
function ownsControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const trigger = target.closest<HTMLButtonElement>('[data-staff-edit-trigger]');
  if (trigger && !trigger.disabled && !trigger.closest('[data-staff-row-action]')) return false;
  return !!target.closest(controls);
}
function startsInSelection(selection: Selection | null, target: EventTarget | null, x: number, y: number) {
  if (!selection?.toString()) return false;
  let measured = false;
  for (let i = 0; i < selection.rangeCount; i++) {
    for (const rect of selection.getRangeAt(i).getClientRects?.() ?? []) {
      measured = true;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
    }
  }
  return !measured && target instanceof Node && !!selection.anchorNode && target.contains(selection.anchorNode);
}
/** Candidate tracking never captures/cancels a normal click. Only an actual drag owns its release click. */
export function StaffAdminRow({ children, enabled, revealed = false, onReveal, onClick }: {
  children: ReactNode; enabled: boolean; revealed?: boolean; onReveal: (show: boolean) => void; onClick: (event: ReactMouseEvent<HTMLTableRowElement>) => void;
}) {
  const row = useRef<HTMLTableRowElement>(null);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const offset = useRef(0);
  const gesture = useRef<{ id: number; x: number; y: number; offset: number; horizontal: boolean; mouse: boolean; selecting: boolean; moved: boolean; preselected: boolean } | null>(null);
  const wheel = useRef<{ x: number; at: number; handled: boolean } | null>(null);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressReleaseClick = useRef(false);
  const width = useCallback(() => panel?.getBoundingClientRect().width || Math.min(240, (row.current?.clientWidth || 440) * .55), [panel]);
  const translate = useCallback((value: number) => {
    offset.current = Math.max(-width(), Math.min(0, value));
    row.current?.style.setProperty('--staff-swipe-x', `${offset.current}px`);
    if (row.current) row.current.dataset.staffSwipeVisible = String(offset.current < 0);
  }, [width]);
  const endPointer = useCallback(() => {
    const start = gesture.current;
    gesture.current = null;
    if (row.current) delete row.current.dataset.staffDragging;
    return start;
  }, []);
  useEffect(() => {
    const resize = () => { if (!gesture.current) translate(enabled && revealed ? -width() : 0); };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (row.current) observer?.observe(row.current);
    return () => observer?.disconnect();
  }, [enabled, revealed, translate, width]);
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const cancel = () => {
      if (gesture.current?.horizontal) suppressReleaseClick.current = true;
      endPointer(); wheel.current = null;
      clearTimeout(wheelTimer.current);
      translate(enabled && revealed ? -width() : 0);
    };
    if (!enabled) cancel();
    const visibility = () => { if (document.visibilityState === 'hidden') cancel(); };
    const key = (event: KeyboardEvent) => { suppressReleaseClick.current = false; if (event.key === 'Escape') cancel(); };
    // A new press always represents a new intent, never the previous drag's click.
    const newPress = () => { suppressReleaseClick.current = false; };
    const move = (event: PointerEvent) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      if (!enabled || (start.mouse && !(event.buttons & 1))) { cancel(); return; }
      const dx = Math.abs(event.clientX - start.x), dy = Math.abs(event.clientY - start.y);
      if (dx >= 8 || dy >= 8) start.moved = true;
      if (start.selecting) return; // Observe selection releases without taking over text selection.
      const selection = window.getSelection();
      if (!start.mouse && selection?.toString()) { cancel(); return; }
      if (!start.horizontal && dy > 12 && dy >= dx) {
        if (start.mouse) start.selecting = true;
        else cancel();
        return;
      }
      if ((start.horizontal || dx >= 16) && dx > dy * 1.6) {
        if (start.mouse && !start.preselected && selection?.toString() && !element.contains(selection.anchorNode)) { start.selecting = true; return; }
        start.horizontal = true;
        element.dataset.staffDragging = 'true';
        if (start.mouse && !start.preselected && selection?.toString()) selection.removeAllRanges();
        event.preventDefault();
        translate(start.offset + event.clientX - start.x);
      }
    };
    const up = (event: PointerEvent) => {
      if (gesture.current?.id !== event.pointerId) return;
      const start = endPointer()!;
      if (start.horizontal || (start.moved && (start.selecting || window.getSelection()?.toString()))) suppressReleaseClick.current = true;
      if (!enabled || !start.horizontal || (start.mouse && event.button !== 0)
        || Math.abs(event.clientX - start.x) < 48 || Math.abs(event.clientX - start.x) <= Math.abs(event.clientY - start.y) * 1.6) {
        translate(enabled && revealed ? -width() : 0); return;
      }
      const show = event.clientX < start.x;
      translate(show ? -width() : 0); onReveal(show);
    };
    const lostCapture = (event: PointerEvent) => { if (gesture.current?.id === event.pointerId) cancel(); };
    const click = (event: MouseEvent) => {
      const suppress = suppressReleaseClick.current;
      suppressReleaseClick.current = false;
      if (suppress && event.detail > 0 && event.target instanceof Node && element.contains(event.target)) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    const mouseMove = (event: MouseEvent) => { if (gesture.current?.horizontal) event.preventDefault(); };
    const nativeDrag = (event: DragEvent) => { if (gesture.current && !gesture.current.selecting) event.preventDefault(); };
    const horizontalWheel = (event: WheelEvent) => {
      if (!enabled || gesture.current || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
        || window.getSelection()?.toString() || ownsControl(event.target)) { wheel.current = null; return; }
      const { deltaX, deltaY } = event;
      if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !deltaX || Math.abs(deltaX) <= Math.abs(deltaY) * 1.6) { wheel.current = null; return; }
      event.preventDefault();
      const now = Date.now(), previous = wheel.current;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth || window.innerWidth : 1;
      const sameBurst = previous && now - previous.at < 250 && Math.sign(previous.x) === Math.sign(deltaX);
      const next = { x: (sameBurst ? previous.x : 0) + deltaX * unit, at: now, handled: sameBurst ? previous.handled : false };
      wheel.current = next;
      clearTimeout(wheelTimer.current);
      if (!next.handled) translate((revealed ? -width() : 0) - next.x);
      if (!next.handled && Math.abs(next.x) >= 48) {
        next.handled = true; translate(next.x > 0 ? -width() : 0); onReveal(next.x > 0);
      } else if (!next.handled) wheelTimer.current = setTimeout(() => translate(revealed ? -width() : 0), 150);
    };
    element.addEventListener('wheel', horizontalWheel, { passive: false });
    document.addEventListener('pointerdown', newPress, true);
    document.addEventListener('pointermove', move, { capture: true, passive: false });
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('lostpointercapture', lostCapture, true);
    document.addEventListener('mousemove', mouseMove, { capture: true, passive: false });
    document.addEventListener('dragstart', nativeDrag, true);
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(wheelTimer.current);
      element.removeEventListener('wheel', horizontalWheel);
      document.removeEventListener('pointerdown', newPress, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('lostpointercapture', lostCapture, true);
      document.removeEventListener('mousemove', mouseMove, true);
      document.removeEventListener('dragstart', nativeDrag, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', key);
    };
  }, [enabled, revealed, onReveal, endPointer, translate, width]);
  const cells = Children.toArray(children);
  return <StaffRowPanelContext value={panel}><tr ref={row} className={`${styles.expandableRow} ${styles.swipePresentationRow} ${enabled ? styles.swipeRow : ''}`}
    onPointerDown={event => {
      endPointer();
      const mouse = event.pointerType === 'mouse';
      if (!enabled || (!mouse && event.pointerType !== 'touch') || event.isPrimary === false || event.defaultPrevented || ownsControl(event.target)) return;
      if (mouse && event.button !== 0) return;
      const selection = window.getSelection(), preselected = !!selection?.toString();
      const selectedOrigin = startsInSelection(selection, event.target, event.clientX, event.clientY);
      const selecting = selectedOrigin || (mouse && (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.detail > 1));
      wheel.current = null;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: offset.current, horizontal: false, mouse, selecting, moved: false, preselected };
    }} onClick={onClick}>{cells.map((cell, index) => isValidElement<{ children?: ReactNode }>(cell) && cell.type === 'td'
      ? cloneElement(cell, {}, <>{index === cells.length - 1 && <div ref={setPanel} className={styles.swipeBackdrop} data-staff-row-action aria-hidden={!enabled || !revealed} inert={!enabled || !revealed} />}<div className={styles.swipeCell}>{cell.props.children}</div></>)
      : cell)}</tr></StaffRowPanelContext>;
}

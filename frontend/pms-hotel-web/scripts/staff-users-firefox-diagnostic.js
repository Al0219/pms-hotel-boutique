/* Paste into Firefox Console on the authenticated /seguridad/usuarios route.
 * Read-only instrumentation: never clicks, writes, retries, changes event methods,
 * reads input values, cookies, storage, API payloads or React internals.
 * Remove with staffUsersQA.stop(). A reload also removes it.
 */
(() => {
  if (location.pathname !== '/seguridad/usuarios') throw new Error('Open /seguridad/usuarios first.');
  window.staffUsersQA?.stop();
  const traces = [], removers = [], serials = new WeakMap();
  let serial = 0, sequence = 0, point = null;
  const tag = value => value instanceof Element ? {
    tag: value.tagName, editGroup: value.getAttribute('data-staff-edit-trigger'),
    rowAction: value.hasAttribute('data-staff-row-action'),
    disabled: 'disabled' in value ? value.disabled : undefined,
  } : null;
  const rows = () => [...document.querySelectorAll('table')].find(table => table.caption?.textContent === 'Usuarios Staff')?.querySelectorAll('tbody > tr') ?? [];
  const snapshot = () => ({
    path: location.pathname, visibility: document.visibilityState, focused: document.hasFocus(),
    navigationType: performance.getEntriesByType('navigation')[0]?.type,
    serviceWorker: !!navigator.serviceWorker?.controller,
    scripts: [...document.scripts].map(script => script.src).filter(src => src.startsWith(location.origin + '/_next/')).map(src => new URL(src).pathname),
    rows: [...rows()].map(row => {
      if (!serials.has(row)) serials.set(row, ++serial);
      return {
        node: serials.get(row), connected: row.isConnected, hidden: row.hidden,
        cells: row.cells.length, inert: !!row.closest('[inert]'),
        sessionBlocked: !!row.closest('[data-staff-session-blocked="true"]'),
        busy: !!row.closest('[aria-busy="true"]'), pointerEvents: getComputedStyle(row).pointerEvents,
        controls: [...row.querySelectorAll('[data-staff-edit-trigger]')].map(tag),
        editors: row.querySelectorAll('form').length,
      };
    }),
  });
  const hit = (x = point?.x, y = point?.y) => x == null ? [] : document.elementsFromPoint(x, y).slice(0, 8).map(element => ({
    ...tag(element), pointerEvents: getComputedStyle(element).pointerEvents,
    position: getComputedStyle(element).position, zIndex: getComputedStyle(element).zIndex,
    inTable: !!element.closest('table'),
  }));
  function watch(target, type, capture, stage) {
    const listener = event => {
      if (event instanceof PointerEvent || event instanceof MouseEvent) point = { x: event.clientX, y: event.clientY };
      const trace = { sequence: ++sequence, type, stage, target: tag(event.target), trusted: event.isTrusted,
        prevented: event.defaultPrevented, pointerType: event.pointerType, buttons: event.buttons,
        detail: event.detail, selectionLength: window.getSelection()?.toString().length ?? 0 };
      if (type === 'pointerdown') { trace.hit = hit(); trace.before = snapshot().rows; }
      traces.push(trace); if (traces.length > 240) traces.shift();
      if (stage === 'window-capture') queueMicrotask(() => {
        trace.preventedAfterDispatch = event.defaultPrevented;
        trace.stoppedAfterDispatch = event.cancelBubble;
      });
      if (type === 'click' && stage === 'window-capture') setTimeout(() => {
        trace.after = snapshot().rows; console.log('[staff-users-qa click]', trace);
      }, 150);
    };
    target.addEventListener(type, listener, { capture, passive: true });
    removers.push(() => target.removeEventListener(type, listener, capture));
  }
  for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'click']) {
    watch(window, type, true, 'window-capture');
    watch(document, type, false, 'document-bubble');
    watch(window, type, false, 'window-bubble');
  }
  watch(window, 'pointermove', true, 'window-capture');
  watch(window, 'blur', true, 'window-capture');
  watch(window, 'focus', true, 'window-capture');
  watch(document, 'visibilitychange', true, 'document-capture');
  const observer = new MutationObserver(() => {
    const state = snapshot().rows;
    if (JSON.stringify(state) !== observer.previous) {
      observer.previous = JSON.stringify(state);
      traces.push({ sequence: ++sequence, type: 'row-state-change', rows: state });
      if (traces.length > 240) traces.shift();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['hidden', 'inert', 'disabled', 'aria-busy', 'data-staff-session-blocked'] });
  const stop = () => { removers.forEach(remove => remove()); observer.disconnect(); delete window.staffUsersQA; };
  window.staffUsersQA = { snapshot, hit, report: () => ({ snapshot: snapshot(), traces: [...traces] }), stop };
  console.log('[staff-users-qa ready]', snapshot());
})();

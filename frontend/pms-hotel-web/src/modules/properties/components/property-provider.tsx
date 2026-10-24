"use client";

import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from "react";
import { useStaffSession } from "@/modules/auth";
import { allProperties, defaultStaffProperty, resolvePropertyScope, type PropertyScope } from "../model/property-scope";

interface PropertyContextValue {
  scope: PropertyScope | null;
  selection: string;
  select: (id: string, options?: { allowEmptyAll: boolean }) => void;
  ready: boolean;
  notice: string;
  /** Opt-in navigation guard for authorized inline drafts; never guards forced identity changes. */
  registerSelectionGuard: (guard: (proceed: () => void) => void) => () => void;
}
const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const session = useStaffSession();
  const selectionGuard = useRef<((proceed: () => void) => void) | null>(null);
  const registerSelectionGuard = useCallback((guard: (proceed: () => void) => void) => {
    selectionGuard.current = guard;
    return () => { if (selectionGuard.current === guard) selectionGuard.current = null; };
  }, []);
  const [selection, setSelection] = useState<{ key: string; id: string; allowEmptyAll?: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const key = `pms:private-09:scope:${session.id}`;
  const ready = selection?.key === key;
  const initial = defaultStaffProperty(session);
  const chosen = ready && resolvePropertyScope(session, selection.id, selection.allowEmptyAll) ? selection.id : initial;
  useEffect(() => {
    let active = true;
    // Each mount/session starts from authorized defaults, not an old storage preference.
    queueMicrotask(() => {
      if (!active) return;
      setSelection(current => current?.key === key && current.id === chosen ? current : { key, id: chosen, allowEmptyAll: current?.allowEmptyAll });
      try {
        if (chosen) sessionStorage.setItem(key, chosen);
        else sessionStorage.removeItem(key);
      } catch { setNotice("El cambio de propiedad estará disponible durante esta visita."); }
    });
    return () => { active = false; };
  }, [key, chosen]);
  const scope = ready ? resolvePropertyScope(session, chosen, selection?.allowEmptyAll) : null;
  const select = (id: string, options?: { allowEmptyAll: boolean }) => {
    const next = resolvePropertyScope(session, id, options?.allowEmptyAll);
    if (!next) { setNotice("Selecciona una propiedad autorizada."); return; }
    const proceed = () => {
      setSelection({ key, id, allowEmptyAll: options?.allowEmptyAll });
      setNotice(id === allProperties ? "Contexto cambiado a todas tus propiedades autorizadas." : `Contexto cambiado a ${session.memberships.find(item => item.propertyId === id && item.active)?.name ?? "la propiedad seleccionada"}.`);
      try { sessionStorage.setItem(key, id); }
      catch { setNotice("Contexto actualizado durante esta visita."); }
    };
    if (id !== chosen && selectionGuard.current) selectionGuard.current(proceed);
    else proceed();
  };
  return <PropertyContext.Provider value={{ scope, selection: scope ? chosen : "", select, ready, notice, registerSelectionGuard }}>{children}</PropertyContext.Provider>;
}

export function usePropertyScope() {
  const value = useContext(PropertyContext);
  if (!value) throw new Error("PROPERTY_PROVIDER_REQUIRED");
  return value;
}

export function PropertySwitcher({ compact = false, allowEmptyAll = false, announceOnly = false }: { compact?: boolean; allowEmptyAll?: boolean; announceOnly?: boolean } = {}) {
  const session = useStaffSession();
  const context = usePropertyScope();
  const memberships = session.memberships.filter(property => property.active);
  const emptyAll = allowEmptyAll && session.roleId === "SUPER_ADMIN" && session.permissions.includes("STAFF_MANAGE") && session.permissions.includes("MULTI_PROPERTY_READ");
  const selectedProperty = memberships.find(property => property.propertyId === context.selection);
  const title = context.selection === allProperties ? 'Todas mis propiedades autorizadas'
    : selectedProperty ? selectedProperty.name : 'Selecciona una propiedad';
  return <div>
    <label htmlFor="staff-property">Propiedad</label>{" "}
    <select id="staff-property" title={compact ? title : undefined} value={context.selection} disabled={!context.ready || (!memberships.length && !emptyAll)} onChange={event => context.select(event.target.value, { allowEmptyAll: emptyAll })}>
      <option value="" disabled>Selecciona una propiedad</option>
      {session.permissions.includes("MULTI_PROPERTY_READ") && (memberships.length > 0 || emptyAll) && <option value={allProperties}>{compact ? 'Todas mis propiedades' : 'Todas mis propiedades autorizadas'}</option>}
      {memberships.map(property => <option key={property.propertyId} value={property.propertyId}>{compact ? property.name : `${property.propertyId} · ${property.name}`}</option>)}
    </select>
    {context.ready && !context.scope && <p role="status">No hay un contexto autorizado seleccionado.</p>}
    <p role="status" style={announceOnly ? { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" } : undefined}>{context.notice}</p>
  </div>;
}

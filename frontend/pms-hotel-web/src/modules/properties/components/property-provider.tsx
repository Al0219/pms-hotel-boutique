"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStaffSession } from "@/modules/auth";
import { allProperties, defaultStaffProperty, resolvePropertyScope, type PropertyScope } from "../model/property-scope";

interface PropertyContextValue {
  scope: PropertyScope | null;
  selection: string;
  select: (id: string) => void;
  ready: boolean;
  notice: string;
}
const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const session = useStaffSession();
  const [selection, setSelection] = useState<{ key: string; id: string } | null>(null);
  const [notice, setNotice] = useState("");
  const key = `pms:private-09:scope:${session.id}`;
  const ready = selection?.key === key;
  const initial = defaultStaffProperty(session);
  const chosen = ready && resolvePropertyScope(session, selection.id) ? selection.id : initial;
  useEffect(() => {
    let active = true;
    // Each mount/session starts from authorized defaults, not an old storage preference.
    queueMicrotask(() => {
      if (!active) return;
      setSelection(current => current?.key === key && current.id === chosen ? current : { key, id: chosen });
      try {
        if (chosen) sessionStorage.setItem(key, chosen);
        else sessionStorage.removeItem(key);
      } catch { setNotice("El cambio de propiedad estará disponible durante esta visita."); }
    });
    return () => { active = false; };
  }, [key, chosen]);
  const scope = ready ? resolvePropertyScope(session, chosen) : null;
  const select = (id: string) => {
    const next = resolvePropertyScope(session, id);
    if (!next) { setNotice("Selecciona una propiedad autorizada."); return; }
    setSelection({ key, id });
    setNotice(id === allProperties ? "Contexto cambiado a todas tus propiedades autorizadas." : `Contexto cambiado a ${id}.`);
    try { sessionStorage.setItem(key, id); }
    catch { setNotice("Contexto actualizado durante esta visita."); }
  };
  return <PropertyContext.Provider value={{ scope, selection: scope ? chosen : "", select, ready, notice }}>{children}</PropertyContext.Provider>;
}

export function usePropertyScope() {
  const value = useContext(PropertyContext);
  if (!value) throw new Error("PROPERTY_PROVIDER_REQUIRED");
  return value;
}

export function PropertySwitcher({ compact = false }: { compact?: boolean } = {}) {
  const session = useStaffSession();
  const context = usePropertyScope();
  const memberships = session.memberships.filter(property => property.active);
  const selectedProperty = memberships.find(property => property.propertyId === context.selection);
  const title = context.selection === allProperties ? 'Todas mis propiedades autorizadas'
    : selectedProperty ? `${selectedProperty.name} · ${selectedProperty.propertyId}` : 'Selecciona una propiedad';
  return <div>
    <label htmlFor="staff-property">Propiedad</label>{" "}
    <select id="staff-property" title={compact ? title : undefined} value={context.selection} disabled={!context.ready || !memberships.length} onChange={event => context.select(event.target.value)}>
      <option value="" disabled>Selecciona una propiedad</option>
      {session.permissions.includes("MULTI_PROPERTY_READ") && memberships.length > 0 && <option value={allProperties}>{compact ? 'Todas mis propiedades' : 'Todas mis propiedades autorizadas'}</option>}
      {memberships.map(property => <option key={property.propertyId} value={property.propertyId}>{compact ? property.name : `${property.propertyId} · ${property.name}`}</option>)}
    </select>
    {context.ready && !context.scope && <p role="status">No hay un contexto autorizado seleccionado.</p>}
    <p role="status">{context.notice}</p>
  </div>;
}

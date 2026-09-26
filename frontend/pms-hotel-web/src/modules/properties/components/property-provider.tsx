"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStaffSession } from "@/modules/auth";
import { allProperties, resolvePropertyScope, type PropertyScope } from "../model/property-scope";

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
  const [selection, setSelection] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const key = `pms:private-09:scope:${session.id}`;
  useEffect(() => {
    let active = true;
    // Wait until hydration; persisted data is only a preference, never authorization.
    queueMicrotask(() => {
      if (!active) return;
      try { setSelection(sessionStorage.getItem(key) ?? ""); }
      catch { setNotice("El cambio de propiedad estará disponible durante esta visita."); }
      setReady(true);
    });
    return () => { active = false; };
  }, [key]);
  const chosen = selection || session.memberships[0]?.propertyId || "";
  const scope = ready ? resolvePropertyScope(session, chosen) : null;
  const select = (id: string) => {
    const next = resolvePropertyScope(session, id);
    if (!next) { setNotice("Selecciona una propiedad autorizada."); return; }
    setSelection(id);
    setNotice(id === allProperties ? "Contexto cambiado a todas tus propiedades autorizadas." : `Contexto cambiado a ${id}.`);
    try { sessionStorage.setItem(key, id); }
    catch { setNotice("Contexto actualizado. No se pudo conservar la selección al recargar."); }
  };
  return <PropertyContext.Provider value={{ scope, selection: scope ? chosen : "", select, ready, notice }}>{children}</PropertyContext.Provider>;
}

export function usePropertyScope() {
  const value = useContext(PropertyContext);
  if (!value) throw new Error("PROPERTY_PROVIDER_REQUIRED");
  return value;
}

export function PropertySwitcher() {
  const session = useStaffSession();
  const context = usePropertyScope();
  return <div>
    <label htmlFor="staff-property">Propiedad</label>{" "}
    <select id="staff-property" value={context.selection} disabled={!context.ready || !session.memberships.length} onChange={event => context.select(event.target.value)}>
      <option value="" disabled>Selecciona una propiedad</option>
      {session.permissions.includes("MULTI_PROPERTY_READ") && session.memberships.length > 0 && <option value={allProperties}>Todas mis propiedades autorizadas</option>}
      {session.memberships.map(property => <option key={property.propertyId} value={property.propertyId}>{property.propertyId} · {property.name}</option>)}
    </select>
    {context.ready && !context.scope && <p role="status">No hay un contexto autorizado seleccionado.</p>}
    <p role="status">{context.notice}</p>
  </div>;
}

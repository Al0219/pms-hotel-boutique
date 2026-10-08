"use client";
import { useEffect, useState } from "react";
import { SecurityFrame, DemoLoadState, DemoFeedback } from "@/modules/security";
import { useRoles } from "../hooks/use-roles";
import type { RolePreview } from "../model/role";
import { exampleProperties, permissionGroups } from "../model/catalog";
import styles from "./roles.module.css";

export function RolesPage() {
  const { query, mutation } = useRoles();
  const [draft, setDraft] = useState<RolePreview[] | null>(null);
  const [selectedId, setSelectedId] = useState("gerencia");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const roles = draft ?? query.data ?? [];
  const selected = roles.find(role => role.id === selectedId) ?? roles[0];
  const dirty = draft !== null;
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function update(values: Partial<RolePreview>) {
    if (selected) setDraft(roles.map(role => role.id === selected.id ? { ...role, ...values, configured: true } : role));
    mutation.reset(); setNotice("");
  }
  function save() {
    if (roles.some(role => !role.name.trim()) || new Set(roles.map(role => role.name.trim().toLocaleLowerCase("es"))).size !== roles.length) {
      mutation.reset(); setNotice("Cada rol necesita un nombre único y no vacío."); return;
    }
    setNotice("");
    mutation.mutate({ type: "save", roles }, { onSuccess: () => { setDraft(null); setNotice("Cambios guardados en esta demostración."); } });
  }
  function reset() {
    mutation.mutate({ type: "reset" }, { onSuccess: () => { setDraft(null); setNotice("Datos de ejemplo restablecidos."); } });
  }
  function create(copy?: RolePreview) {
    const value = copy ? `${copy.name.slice(0, 42)} (copia)` : name.trim();
    if (!value || roles.some(role => role.name.trim().toLocaleLowerCase("es") === value.toLocaleLowerCase("es"))) {
      setNotice("Escribe un nombre de rol único. Renombra la copia existente antes de duplicar otra vez."); return;
    }
    const role: RolePreview = { id: crypto.randomUUID(), name: value, users: 0, description: copy?.description ?? null,
      permissions: [...(copy?.permissions ?? [])], properties: [...(copy?.properties ?? [])], configured: copy?.configured ?? false };
    setDraft([...roles, role]); setSelectedId(role.id); setSearch(""); setCreating(false); setName("");
    mutation.reset(); setNotice("Rol añadido al borrador. Guarda los cambios para conservarlo.");
  }
  return <SecurityFrame title="Roles y Permisos" description="Roles de ejemplo, propiedades asignadas y matriz editable." dirty={dirty}>
    <DemoLoadState offline={query.fetchStatus === "paused"} pending={query.isPending} error={query.isError} busy={mutation.isPending}
      retry={() => { void query.refetch(); }} reset={reset} />
    {query.data && <fieldset className={styles.editor} disabled={mutation.isPending}>
      <div className={styles.toolbar}>
        <button type="button" onClick={() => setCreating(!creating)} aria-expanded={creating}>Crear Nuevo Rol</button>
        <span>{dirty ? "Cambios sin guardar · todos los roles del borrador" : "Sin cambios pendientes"}</span>
        <button type="button" onClick={save} disabled={!dirty}>Guardar Cambios</button>
        <button type="button" disabled={!dirty} onClick={() => { setDraft(null); mutation.reset(); setNotice("Borrador descartado."); }}>Descartar cambios</button>
      </div>
      {creating && <form onSubmit={event => { event.preventDefault(); create(); }}>
        <label>Nombre del nuevo rol<input value={name} onChange={event => setName(event.target.value)} required maxLength={60} autoFocus /></label>
        <button type="submit">Crear rol de ejemplo</button>{" "}<button type="button" onClick={() => setCreating(false)}>Cancelar</button>
      </form>}
      <div className={styles.grid}>
        <section className={styles.panel} aria-label="Roles del Sistema">
          <h2>Roles del Sistema</h2><label>Buscar rol<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <div className={styles.list}>{roles.filter(role => role.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))).map(role =>
            <button type="button" key={role.id} aria-pressed={role.id === selected?.id} onClick={() => setSelectedId(role.id)}>
              <strong>{role.name}</strong><small>{role.users} usuarios · {role.configured ? "Configurado" : "Sin configuración"}</small>
            </button>)}</div>
          {!roles.some(role => role.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))) && <p>No se encontraron roles.</p>}
        </section>
        {selected ? <section className={styles.panel} aria-label="Editar rol">
          <h2>Rol: {selected.name}</h2><p>{selected.configured ? "Configuración de demostración" : "Sin configuración; no se han concedido permisos."}</p>
          <label>Nombre del rol<input value={selected.name} maxLength={60} onChange={event => update({ name: event.target.value })} /></label>
          <label>Descripción<textarea value={selected.description ?? ""} maxLength={300} onChange={event => update({ description: event.target.value.trim() ? event.target.value : null })} /></label>
          <button type="button" onClick={() => create(selected)}>Duplicar Rol</button>
          <fieldset><legend>Propiedades asignadas de ejemplo</legend>
            {exampleProperties.map(id => <label key={id}><input type="checkbox" checked={selected.properties.includes(id)} onChange={() => update({ properties: selected.properties.includes(id) ? selected.properties.filter(value => value !== id) : [...selected.properties, id] })} />{id}</label>)}
            <p>{selected.properties.length ? selected.properties.join(" · ") : "Sin propiedades asignadas"}</p>
            <p>Esta lista no activa ALL_PROPERTIES ni cambia el rol de la sesión.</p>
          </fieldset>
          <h3>Matriz de Permisos</h3>
          {permissionGroups.map(group => <fieldset key={group.title}><legend>{group.title}</legend>
            {group.permissions.map(permission => <label key={permission.id}><input type="checkbox" role="switch" aria-label={permission.id}
              disabled={permission.id === "BYPASS_RESTRICTIONS"} checked={selected.permissions.includes(permission.id)}
              onChange={() => update({ permissions: selected.permissions.includes(permission.id) ? selected.permissions.filter(id => id !== permission.id) : [...selected.permissions, permission.id] })} />
              <strong>{permission.id}</strong><small>{permission.description}</small></label>)}
          </fieldset>)}
        </section> : <p>No hay roles. Crea un rol de ejemplo para comenzar.</p>}
      </div>
    </fieldset>}
    <DemoFeedback offline={mutation.isPaused} pending={mutation.isPending} error={mutation.isError} notice={notice}
      retry={() => { if (mutation.variables?.type === "reset") reset(); else save(); }} />
  </SecurityFrame>;
}

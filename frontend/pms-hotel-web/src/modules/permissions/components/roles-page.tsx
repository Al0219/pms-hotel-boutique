"use client";

import Link from "next/link";
import { useState } from "react";
import type { RolePreview } from "../model/role";
import styles from "./roles.module.css";

const navigation = ["Dashboard", "Revenue", "CRM", "Reportes", "Grupos / Eventos", "Inventario", "Compras", "Personal", "Roles / Permisos", "Auditoría", "Integraciones"];
const destinations: Record<string, string> = { Dashboard: "/multi-property", "Roles / Permisos": "/seguridad/roles", "Auditoría": "/seguridad/auditoria" };
const permissionGroups = [
  { title: "Multi-property & Dashboard", permissions: [
    { id: "MULTI_PROPERTY_READ", description: "Permite ver métricas consolidadas." },
    { id: "COMPARE_AVAILABILITY", description: "Permite usar el buscador cross-property." },
  ] },
  { title: "Reservas & Rebooking", permissions: [
    { id: "CREATE_RESERVATION", description: "Crear nuevas reservas." },
    { id: "CROSS_PROPERTY_REBOOKING", description: "Permite trasladar stays entre propiedades." },
    { id: "BYPASS_RESTRICTIONS", description: "Ignorar restricciones de estadía mínima (Requiere SuperAdmin)." },
  ] },
  { title: "Revenue & Tarifas", permissions: [
    { id: "VIEW_RATES", description: "Visualizar BAR y tarifas corporativas." },
    { id: "RATE_OVERRIDE", description: "Modificar tarifas manualmente en motor de reservas." },
  ] },
];

function RolesSidebar() {
  return <aside className={styles.sidebar} aria-label="Navegación de Gerencia">
    <div className={styles.brand}>Hotel Boutique<span>ADMINISTRACIÓN</span></div>
    <nav aria-label="Módulos de Gerencia">{navigation.map(label => destinations[label]
      ? <Link key={label} href={destinations[label]} prefetch={label === "Dashboard" ? false : undefined} className={label === "Roles / Permisos" ? styles.active : undefined} aria-current={label === "Roles / Permisos" ? "page" : undefined}>{label}</Link>
      : <button key={label} type="button" onClick={() => {
        // TODO: Conectar ruta por compañero.
      }}>{label}</button>)}</nav>
    <footer><span className={styles.avatar} aria-hidden="true">G</span>Gerencia · Usuario</footer>
  </aside>;
}

function PermissionMatrix({ enabled, onToggle }: { enabled: readonly string[]; onToggle: (id: string) => void }) {
  return <div className={styles.matrix}><h3>Matriz de Permisos</h3>{permissionGroups.map(group => <fieldset key={group.title}>
    <legend>{group.title}</legend>
    {group.permissions.map(permission => <label className={styles.permission} key={permission.id}>
      <span><strong>{permission.id}</strong><small>{permission.description}</small></span>
      <span className={styles.switch}>
        <input type="checkbox" role="switch" aria-label={permission.id} checked={enabled.includes(permission.id)} disabled={permission.id === "BYPASS_RESTRICTIONS"} onChange={() => onToggle(permission.id)} />
        <span className={styles.track} aria-hidden="true" />
      </span>
    </label>)}
  </fieldset>)}</div>;
}

export function RolesPage({ initialRoles }: { initialRoles: readonly RolePreview[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedId, setSelectedId] = useState("gerencia");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const selected = roles.find(role => role.id === selectedId)!;
  const filtered = roles.filter(role => role.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));

  function duplicateRole() {
    const id = crypto.randomUUID();
    setRoles([...roles, { ...selected, id, name: `${selected.name} (copia)`, users: 0 }]);
    setSelectedId(id);
    setSearch("");
    setNotice("Copia creada en esta demostración. No se asignaron usuarios ni accesos reales.");
  }

  return <div className={styles.layout}>
    <RolesSidebar />
    <section className={styles.content} aria-labelledby="roles-title">
      <header className={styles.header}><div><h1 id="roles-title">Roles y Permisos</h1><p>Gestión de accesos, scopes de propiedades y matriz de autorización.</p></div>
        <button className={styles.primary} type="button" onClick={() => setCreating(!creating)} aria-expanded={creating} aria-controls="create-role">+ Crear Nuevo Rol</button>
      </header>
      {creating && <form id="create-role" className={styles.createForm} onSubmit={event => {
        event.preventDefault();
        const value = name.trim();
        if (!value || roles.some(role => role.name.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"))) { setNotice("Escribe un nombre de rol único."); return; }
        const id = crypto.randomUUID();
        setRoles([...roles, { id, name: value, users: 0 }]);
        setSelectedId(id); setCreating(false); setName(""); setSearch("");
        setNotice("Rol creado localmente sin accesos asignados.");
      }}><label htmlFor="role-name">Nombre del nuevo rol</label><input id="role-name" value={name} onChange={event => setName(event.target.value)} required maxLength={60} /><button className={styles.primary} type="submit">Crear rol de ejemplo</button><button type="button" onClick={() => setCreating(false)}>Cancelar</button></form>}
      <div className={styles.grid}>
        <section className={styles.roleCard} aria-labelledby="role-list-title">
          <div className={styles.listHeader}><h2 id="role-list-title">Roles del Sistema</h2><input type="search" aria-label="Buscar rol" placeholder="Buscar rol..." value={search} onChange={event => setSearch(event.target.value)} /></div>
          <div className={styles.roleList}>{filtered.map(role => <button key={role.id} type="button" className={role.id === selectedId ? styles.selected : undefined} aria-pressed={role.id === selectedId} onClick={() => { setSelectedId(role.id); setNotice(""); }}><strong>{role.name}</strong><small>{role.users} usuarios</small></button>)}</div>
          {filtered.length === 0 && <p className={styles.empty}>No se encontraron roles.</p>}
        </section>
        <section className={styles.detail} aria-labelledby="selected-role-title">
          <header className={styles.detailHeader}><div><div className={styles.roleTitle}><h2 id="selected-role-title">Rol: {selected.name}</h2>{selected.permissions && <span className={styles.badge}>Activo</span>}</div><p>{selected.description ?? "Sin configuración de permisos en esta demostración."}</p></div>
            <div className={styles.actions}><button type="button" onClick={duplicateRole}>Duplicar Rol</button><button type="button" className={styles.primary} onClick={() => setNotice("Cambios conservados solo durante esta sesión de la página. No se modificaron autorizaciones reales.")}>Guardar Cambios</button></div>
          </header>
          <div className={styles.scope}><h3>Propiedades Autorizadas (Scope)</h3><code>{selected.properties ? `ALL_PROPERTIES {${selected.properties.join(", ")}}` : "Sin propiedades asignadas"}</code></div>
          {selected.permissions ? <PermissionMatrix enabled={selected.permissions} onToggle={id => setRoles(roles.map(role => role.id === selectedId ? { ...role, permissions: role.permissions?.includes(id) ? role.permissions.filter(permission => permission !== id) : [...(role.permissions ?? []), id] } : role))} /> : <p className={styles.empty}>La matriz de este rol está pendiente de definición.</p>}
        </section>
      </div>
      <p className={styles.demo}>Demostración con datos de ejemplo · los cambios se restablecen al recargar.</p>
      <p className={styles.notice} role="status">{notice}</p>
    </section>
  </div>;
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { AuditEntry } from "../model/audit-entry";
import styles from "./audit.module.css";

const navigation = ["Revenue", "CRM", "Reportes", "Grupos / Eventos", "Inventario", "Compras", "Personal", "Roles / Permisos", "Auditoría", "Integraciones"];

function AuditSidebar() {
  return <aside className={styles.sidebar} aria-label="Navegación de Gerencia">
    <div className={styles.brand}>Hotel Boutique<span>ADMINISTRACIÓN</span></div>
    <nav aria-label="Módulos de Gerencia">
      <Link href="/multi-property" prefetch={false}>Dashboard</Link>
      {navigation.map((label) =>
  label === "Roles / Permisos" ? (
    <Link key={label} href="/seguridad/roles">
      {label}
    </Link>
  ) : (
    <button
      key={label}
      type="button"
      className={label === "Auditoria" ? styles.active : undefined}
      aria-current={label === "Auditoria" ? "page" : undefined}
      onClick={() => {
        // TODO: Conectar ruta por compañero.
      }}
    >
      {label}
    </button>
  ),
)}
    </nav>
    <footer><span className={styles.avatar} aria-hidden="true">G</span>Gerencia · Usuario</footer>
  </aside>;
}

function AuditMetrics() {
  const metrics = [
    { title: "Eventos registrados (7d)", value: "1,248" },
    { title: "Rebookings Cruzados", value: "14", subtitle: "Scope multi-property" },
    { title: "Overrides de Tarifa", value: "8", subtitle: "Requieren revisión", tone: styles.warningValue },
    { title: "Alertas Críticas", value: "2", subtitle: "Seguridad / Autenticación", tone: styles.criticalValue },
  ];
  return <div className={styles.metrics}>{metrics.map(metric => <article key={metric.title} className={styles.metric}>
    <h2>{metric.title}</h2><strong className={metric.tone}>{metric.value}</strong>
    {metric.subtitle && <p>{metric.subtitle}</p>}
  </article>)}</div>;
}

function StatusBadge({ status }: { status: AuditEntry["status"] }) {
  return <span className={`${styles.badge} ${styles[status]}`}><span aria-hidden="true">●</span>{status}</span>;
}

function AuditTable({ entries }: { entries: readonly AuditEntry[] }) {
  return <div className={styles.tableScroll} role="region" aria-label="Registros de auditoría" tabIndex={0}>
    <table>
      <caption className={styles.srOnly}>Actividad del sistema — datos de demostración</caption>
      <thead><tr>{["FECHA / HORA", "ACTOR", "MÓDULO / ACCIÓN", "PROPIEDAD", "ESTADO", "DETALLE TÉCNICO"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
      <tbody>{entries.map(entry => <tr key={entry.id}>
        <td><span className={styles.date}>{entry.date}</span><small>{entry.id}</small></td>
        <td><strong>{entry.actor}</strong><small>{entry.role}</small></td>
        <td><span>{entry.module}</span><code>{entry.action}</code></td>
        <td><span className={styles.property}>{entry.property}</span></td>
        <td><StatusBadge status={entry.status} /></td>
        <td className={styles.detail}>{entry.detail}</td>
      </tr>)}</tbody>
    </table>
    {entries.length === 0 && <p className={styles.empty}>No hay registros que coincidan con los filtros.</p>}
  </div>;
}

/** Read-only UI demonstration. The supplied records are already presentation models. */
export function AuditPage({ entries }: { entries: readonly AuditEntry[] }) {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [property, setProperty] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = entries.filter(entry =>
    (!module || entry.module === module) && (!property || entry.property === property) &&
    (!status || entry.status === status) &&
    `${entry.id} ${entry.actor} ${entry.detail} ${entry.action}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  const isFiltered = Boolean(search.trim() || module || property || status);

  function exportCsv() {
    const cell = (value: string) => `"${value.replace(/"/g, '""').replace(/^[=+@-]/, "'$&")}"`;
    const rows = [["ID", "Fecha", "Actor", "Rol", "Módulo", "Acción", "Propiedad", "Estado", "Detalle"],
      ...filtered.map(entry => [entry.id, entry.date, entry.actor, entry.role, entry.module, entry.action, entry.property, entry.status, entry.detail])];
    const url = URL.createObjectURL(new Blob(["\uFEFF", rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "auditoria-demo.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Se exportaron ${filtered.length} registros de demostración.`);
  }

  return <div className={styles.layout}>
    <AuditSidebar />
    <section className={styles.content} aria-labelledby="audit-title">
      <header className={styles.header}>
        <div><h1 id="audit-title">Auditoría del Sistema</h1><p>Registro inmutable de actividad · snapshot últimos 7 días · Todas las propiedades</p></div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setNotice("La configuración de alertas estará disponible al integrar el servicio de seguridad.")}>Configurar Alertas</button>
          <button type="button" className={styles.primary} onClick={exportCsv}>Exportar CSV</button>
        </div>
      </header>
      <AuditMetrics />
      <section className={styles.card} aria-label="Historial de auditoría">
        <div className={styles.filters}>
          <input aria-label="Buscar por ID, Usuario o Detalle" placeholder="Buscar por ID, Usuario o Detalle..." value={search} onChange={event => setSearch(event.target.value)} type="search" />
          <select aria-label="Módulo" value={module} onChange={event => setModule(event.target.value)}><option value="">Todos los módulos</option>{["Reservas", "Revenue", "Autenticación", "Roles / Permisos"].map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="Propiedad" value={property} onChange={event => setProperty(event.target.value)}><option value="">Todas las propiedades</option>{["GT-HB-01", "GT-HB-03", "GLOBAL"].map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="Estado" value={status} onChange={event => setStatus(event.target.value)}><option value="">Cualquier estado</option>{["SUCCESS", "WARNING", "CRITICAL", "INFO"].map(value => <option key={value}>{value}</option>)}</select>
        </div>
        <AuditTable entries={filtered} />
        <footer className={styles.pagination}>
          <span>{isFiltered ? `${filtered.length} registros coincidentes en la muestra` : "Mostrando 1 a 5 de 1,248 registros"}</span>
          <div className={styles.actions}><button type="button" disabled>Anterior</button><button type="button" onClick={() => setNotice("Esta demostración incluye cinco registros. Las páginas adicionales requieren integrar la fuente de auditoría.")}>Siguiente</button></div>
        </footer>
      </section>
      <p className={styles.demo}>Vista de demostración · 5 registros de ejemplo · métricas ilustrativas.</p>
      <p role="status" className={styles.notice}>{notice}</p>
    </section>
  </div>;
}

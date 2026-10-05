"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StaffLogout, useStaffSession } from "@/modules/auth";
import { PropertySwitcher } from "@/modules/properties";
import { NotificationBell } from "@/components/NotificationBell";
import styles from "./private-layout.module.css";

const nav = [
  { href: "/dashboard", label: "Panel", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/multi-property", label: "Multi-property", roles: ["SUPER_ADMIN", "GERENCIA"] },
  { href: "/reservas", label: "Reservas", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/lista-espera", label: "Lista de espera", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/calendario", label: "Calendario", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/staff/habitaciones", label: "Habitaciones", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/housekeeping", label: "Housekeeping", roles: ["SUPER_ADMIN", "GERENCIA", "OPERACIONES"] },
  { href: "/mantenimiento", label: "Mantenimiento", roles: ["SUPER_ADMIN", "GERENCIA", "OPERACIONES"] },
  { href: "/conserjeria", label: "Conserjería", roles: ["SUPER_ADMIN", "GERENCIA", "OPERACIONES", "RECEPCION"] },
  { href: "/parking-valet", label: "Parking / Valet", roles: ["SUPER_ADMIN", "GERENCIA", "OPERACIONES"] },
  { href: "/grupos", label: "Grupos / Eventos", roles: ["SUPER_ADMIN", "GERENCIA"] },
  { href: "/integraciones", label: "Integraciones", roles: ["SUPER_ADMIN", "GERENCIA"] },
  { href: "/integraciones/errores", label: "Cola de errores", roles: ["SUPER_ADMIN", "GERENCIA"] },
  { href: "/reportes", label: "Reportes", roles: ["SUPER_ADMIN", "GERENCIA", "AUDITOR"] },
  { href: "/mensajeria", label: "Mensajería", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/seguridad/roles", label: "Roles / Permisos", roles: ["SUPER_ADMIN", "GERENCIA"] },
  { href: "/seguridad/auditoria", label: "Auditoría", roles: ["SUPER_ADMIN", "GERENCIA", "AUDITOR"] },
] as const;

function canonicalRole(roleId: string): string {
  return roleId === "superadmin" ? "SUPER_ADMIN" : roleId.toUpperCase();
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const session = useStaffSession();
  const pathname = usePathname();
  const role = canonicalRole(session.roleId);
  const supportsScope = pathname === "/dashboard" || pathname === "/multi-property" || pathname.startsWith("/multi-property/disponibilidad/");
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const mockSession = session.roleId === session.roleId.toLowerCase();
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Private shell sidebar">
      <p className={styles.brand}>PMS Staff</p>
      <nav aria-label="Módulos Staff"><ul className={styles.navList}>
        {nav.filter(entry => (entry.roles as readonly string[]).includes(role)).map(entry => <li key={entry.href}>
          <Link className={styles.navLink} href={entry.href} aria-current={pathname === entry.href ? "page" : undefined}>{entry.label}</Link>
        </li>)}
      </ul></nav>
      <nav aria-label="Mi sesión Staff"><Link className={styles.navLink} href="/seguridad/sesiones">Sesiones y seguridad</Link></nav>
    </aside>
    <div className={styles.mainColumn}>
      <header className={styles.header} aria-label="Private shell header">
        <div><strong>{session.userName}</strong><p>{session.roleName} · {mockSession ? "Sesión de demostración" : "Sesión Staff"}</p></div>
        {supportsScope ? <PropertySwitcher /> : <p className={styles.propertyContext}>{propertyId ? "Contexto propio del módulo: " + propertyId : "Este módulo conserva su contexto de propiedad."}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <NotificationBell />
          <StaffLogout />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}

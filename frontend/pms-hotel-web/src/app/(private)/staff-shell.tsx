"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StaffLogout, useStaffSession } from "@/modules/auth";
import { PropertySwitcher } from "@/modules/properties";
import styles from "./private-layout.module.css";

// Existing route catalogue, grouped by the documented Staff roles.
// Presentation only; no server authorization is implied.
const nav = [
  { href: "/dashboard", label: "Panel", roles: ["gerencia", "recepcion"] },
  { href: "/multi-property", label: "Multi-property", roles: ["gerencia", "recepcion"] },
  { href: "/reservas", label: "Reservas", roles: ["recepcion"] },
  { href: "/lista-espera", label: "Lista de espera", roles: ["recepcion"] },
  { href: "/calendario", label: "Calendario", roles: ["recepcion"] },
  { href: "/habitaciones", label: "Habitaciones", roles: ["recepcion"] },
  { href: "/housekeeping", label: "Housekeeping", roles: ["operaciones"] },
  { href: "/mantenimiento", label: "Mantenimiento", roles: ["operaciones"] },
  { href: "/conserjeria", label: "Conserjería", roles: ["operaciones", "recepcion"] },
  { href: "/parking-valet", label: "Parking / Valet", roles: ["operaciones"] },
  { href: "/grupos", label: "Grupos / Eventos", roles: ["gerencia"] },
  { href: "/integraciones", label: "Integraciones", roles: ["gerencia"] },
  { href: "/integraciones/errores", label: "Cola de errores", roles: ["gerencia"] },
  { href: "/reportes", label: "Reportes", roles: ["gerencia", "recepcion"] },
  { href: "/mensajeria", label: "Mensajería", roles: ["recepcion"] },
  { href: "/seguridad/roles", label: "Roles / Permisos", roles: ["gerencia"] },
  { href: "/seguridad/auditoria", label: "Auditoría", roles: ["gerencia"] },
] as const;

export function StaffShell({ children }: { children: React.ReactNode }) {
  const session = useStaffSession();
  const pathname = usePathname();
  const supportsScope = pathname === "/dashboard" || pathname === "/multi-property" || pathname.startsWith("/multi-property/disponibilidad/");
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Private shell sidebar">
      <p className={styles.brand}>PMS Staff</p>
      <nav aria-label="Módulos Staff"><ul className={styles.navList}>
        {nav.filter(entry => (entry.roles as readonly string[]).includes(session.roleId)).map(entry => <li key={entry.href}>
          <Link className={styles.navLink} href={entry.href} aria-current={pathname === entry.href ? "page" : undefined}>{entry.label}</Link>
        </li>)}
      </ul></nav>
      <nav aria-label="Mi sesión Staff"><Link className={styles.navLink} href="/seguridad/sesiones">Sesiones y seguridad</Link></nav>
    </aside>
    <div className={styles.mainColumn}>
      <header className={styles.header} aria-label="Private shell header">
        <div><strong>{session.userName}</strong><p>{session.roleName} · Sesión de demostración</p></div>
        {supportsScope ? <PropertySwitcher /> : <p className={styles.propertyContext}>{propertyId ? "Contexto propio del módulo: " + propertyId : "Este módulo conserva su contexto de propiedad."}</p>}
        <StaffLogout />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}

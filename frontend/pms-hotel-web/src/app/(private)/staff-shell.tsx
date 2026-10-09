"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from 'react';
import { usePathname } from "next/navigation";
import { StaffLogout, useStaffSession } from "@/modules/auth";
import { PropertySwitcher } from "@/modules/properties";
import { SvgIcon } from "@/shared/components/svg-icon";
import styles from "./private-layout.module.css";

const nav = [
  { href: "/dashboard", label: "Panel", icon: "dashboard", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/reservas", label: "Reservas", icon: "reservations", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/calendario", label: "Calendario", icon: "calendar", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/staff/habitaciones", label: "Habitaciones", icon: "room", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
] as const;

function canonicalRole(roleId: string): string {
  return roleId === "superadmin" ? "SUPER_ADMIN" : roleId.toUpperCase();
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const session = useStaffSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  const pathname = usePathname();
  const role = canonicalRole(session.roleId);
  const supportsScope = pathname === "/dashboard" || pathname === "/multi-property" || pathname.startsWith("/multi-property/disponibilidad/") || pathname === '/reservas' || pathname.startsWith('/reservas/') || pathname === '/calendario' || pathname === '/staff/habitaciones';
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Private shell sidebar">
      <div className={styles.identity}>
        <p className={styles.brand}>PMS Staff</p>
        <strong className={styles.userName}>{session.userName}</strong>
        <p className={styles.role}>{session.roleName}</p>
      </div>
      <button type="button" ref={menuButton} className={styles.menuToggle} aria-expanded={menuOpen} aria-controls="staff-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? 'Cerrar menú' : 'Abrir menú Staff'}</button>
      <div id="staff-navigation" className={menuOpen ? styles.navigationOpen : styles.navigation}>
        <div className={styles.property}>
          {supportsScope ? <PropertySwitcher compact /> : <p className={styles.propertyContext}>{propertyId ? "Contexto propio del módulo: " + propertyId : "Este módulo conserva su contexto de propiedad."}</p>}
        </div>
        <nav aria-label="Módulos Staff"><ul className={styles.navList}>
        {nav.filter(entry => (entry.roles as readonly string[]).includes(role)).map(entry => <li key={entry.href}>
          <Link className={styles.navLink} onClick={() => setMenuOpen(false)} href={entry.href} aria-current={pathname === entry.href || pathname.startsWith(`${entry.href}/`) ? "page" : undefined}><SvgIcon name={entry.icon} /><span>{entry.label}</span></Link>
        </li>)}
        </ul></nav>
        <div className={styles.logout}>
          <SvgIcon name="logout" className={styles.logoutIcon} />
          <StaffLogout />
        </div>
      </div>
    </aside>
    <div className={styles.mainColumn}>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}

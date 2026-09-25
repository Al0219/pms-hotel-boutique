import Link from "next/link";

import styles from "./private-layout.module.css";

/**
 * Composición del shell privado Staff (WEB-3).
 * Solo navegación + contexto de propiedad en modo stub de desarrollo.
 * Sesión/usuario/rol/logout pertenecen a WEB-2 y se conectarán aquí
 * cuando el contrato de Staff Auth esté confirmado.
 */
const STAFF_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Panel" },
  { href: "/reservas", label: "Reservas" },
  { href: "/calendario", label: "Calendario" },
  { href: "/habitaciones", label: "Habitaciones" },
  { href: "/housekeeping", label: "Housekeeping" },
  { href: "/mantenimiento", label: "Mantenimiento" },
  { href: "/empresas", label: "Empresas" },
  { href: "/agencias", label: "Agencias" },
  { href: "/grupos", label: "Grupos" },
  { href: "/integraciones", label: "Integraciones" },
  { href: "/integraciones/errores", label: "Cola de errores" },
  { href: "/reportes", label: "Reportes" },
];

export default function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Private shell sidebar">
        <p className={styles.brand}>PMS Staff</p>
        <nav aria-label="Módulos Staff">
          <ul className={styles.navList}>
            {STAFF_NAV.map((entry) => (
              <li key={entry.href}>
                <Link className={styles.navLink} href={entry.href}>
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.header} aria-label="Private shell header">
          <p className={styles.propertyContext}>
            {propertyId ? `Propiedad: ${propertyId}` : "La sesión debe proporcionar un scope de propiedad autorizado."}
          </p>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

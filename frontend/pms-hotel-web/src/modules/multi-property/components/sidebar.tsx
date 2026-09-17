"use client";

import React from "react";
import styles from "./multi-property.module.css";

export function Sidebar() {
  const navItems = [
    { label: "Dashboard", active: true },
    { label: "Revenue", active: false },
    { label: "CRM", active: false },
    { label: "Reportes", active: false },
    { label: "Grupos / Eventos", active: false },
    { label: "Inventario", active: false },
    { label: "Compras", active: false },
    { label: "Personal", active: false },
    { label: "Roles / Permisos", active: false },
    { label: "Auditoría", active: false },
    { label: "Integraciones", active: false },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        Hotel Boutique
      </div>
      
      <nav className={styles.sidebarNav}>
        {navItems.map((item, idx) => {
          if (item.active) {
            return (
              <div key={idx} className={styles.sidebarNavItemActive}>
                {item.label}
              </div>
            );
          }
          return (
            <a key={idx} href="#" className={styles.sidebarNavItem} onClick={(e) => {
              e.preventDefault();
              // TODO: Conectar ruta por compañero
            }}>
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        Gerencia · Usuario
      </div>
    </aside>
  );
}

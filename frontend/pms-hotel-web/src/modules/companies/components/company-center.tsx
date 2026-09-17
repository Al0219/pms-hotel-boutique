"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useCompanies } from "../hooks/use-companies";
import { CompanyDetail } from "./company-detail";
import styles from "./company-center.module.css";

interface CompanyCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Company contract. */
  endpoint?: string;
}

export function CompanyCenter({ propertyId, endpoint }: Readonly<CompanyCenterProps>) {
  const { data: companies, error, isLoading, refetch } = useCompanies(propertyId, endpoint);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Empresas</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar empresas.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Empresas</h1><p>La consulta de empresas estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando empresas…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar las empresas."
      : "No se pudieron cargar las empresas.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!companies?.length) {
    return <main className={styles.page}><h1>Empresas</h1><p>No hay empresas para esta propiedad.</p></main>;
  }

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>B2B</p>
      <h1>Empresas</h1>
      <p>Consulta las empresas de la propiedad {propertyId}, sus acuerdos, crédito y solicitudes de direct bill.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="company-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Empresas</p><h2 id="company-list-title" className={styles.sectionTitle}>Directorio corporativo</h2></div>
          <span className={styles.count}>{companies.length} registradas</span>
        </div>
        <ul className={styles.list}>
          {companies.map((company) => <li key={company.id}>
            <button
              className={styles.companyButton}
              type="button"
              aria-pressed={company.id === selectedCompany.id}
              onClick={() => setSelectedCompanyId(company.id)}
            >
              <span><strong>{company.legalName}</strong><small>{company.id}</small></span>
              <span className={styles.status}>{company.statusCode}</span>
            </button>
          </li>)}
        </ul>
      </section>
      <CompanyDetail company={selectedCompany} />
    </div>
  </main>;
}

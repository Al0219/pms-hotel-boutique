import type { Company } from "../model/company";

import styles from "./company-center.module.css";

interface CompanyDetailProps {
  company: Company;
}

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function CompanyDetail({ company }: Readonly<CompanyDetailProps>) {
  return <section className={styles.detail} aria-labelledby="company-detail-title">
    <p className={styles.eyebrow}>Company Profile</p>
    <h2 id="company-detail-title">{company.legalName}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Empresa" value={company.id} />
      <Reference label="Estado" value={company.statusCode} />
      <Reference label="Property ID" value={company.propertyId} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="company-agreement-title">
        <h3 id="company-agreement-title">Acuerdo y crédito</h3>
        <dl className={styles.references}>
          <Reference label="Referencia de acuerdo" value={company.agreementReference} />
          <Reference label="Referencia de crédito" value={company.creditReference} />
        </dl>
      </section>
      <section className={styles.detailCard} aria-labelledby="company-billing-title">
        <h3 id="company-billing-title">Direct bill</h3>
        <dl className={styles.references}>
          <Reference label="Solicitud de direct bill" value={company.directBillRequested ? "Solicitado" : "No solicitado"} />
        </dl>
        <p className={styles.note}>
          La aprobación de direct bill no es automática y se resuelve fuera de este módulo. Company no es Guest ni Payer.
        </p>
      </section>
    </div>
  </section>;
}

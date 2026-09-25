import type { Agency } from "../model/agency";

import styles from "./agency-center.module.css";

interface AgencyDetailProps {
  agency: Agency;
}

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function AgencyDetail({ agency }: Readonly<AgencyDetailProps>) {
  return <section className={styles.detail} aria-labelledby="agency-detail-title">
    <p className={styles.eyebrow}>Travel Agency Profile</p>
    <h2 id="agency-detail-title">{agency.legalName}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Agencia" value={agency.id} />
      <Reference label="Estado" value={agency.statusCode} />
      <Reference label="Contrato" value={agency.contractReference} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="commercial-reference-title">
        <h3 id="commercial-reference-title">Referencias comerciales</h3>
        <dl className={styles.references}>
          <Reference label="Referencia de comisión" value={agency.commissionReference} />
          <Reference label="Voucher" value={agency.voucherReference} />
        </dl>
      </section>
      <section className={styles.detailCard} aria-labelledby="property-reference-title">
        <h3 id="property-reference-title">Alcance de propiedad</h3>
        <dl className={styles.references}><Reference label="Property ID" value={agency.propertyId} /></dl>
      </section>
    </div>
  </section>;
}

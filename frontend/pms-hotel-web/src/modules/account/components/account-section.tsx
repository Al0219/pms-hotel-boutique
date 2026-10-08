import Link from "next/link";
import { HttpNetworkError } from "@/lib/http/errors";
import styles from "./account-section.module.css";

export function AccountSection({ title, description, children }: Readonly<{ title: string; description?: string; children: React.ReactNode }>) {
  return <section className={styles.page}>
    <nav className={styles.nav} aria-label="Navegación de cuenta"><Link href="/cuenta">← Mi cuenta</Link><Link href="/cuenta/reservas">Reservas e historial</Link><Link href="/cuenta/perfil">Perfil y configuración</Link><Link href="/cuenta/rewards">Rewards</Link><Link href="/cuenta/promociones">Promociones</Link></nav>
    <h1>{title}</h1>{description && <p>{description}</p>}{children}
  </section>;
}
export function AccountFeedback({ loading, error, retry }: Readonly<{ loading?: boolean; error?: unknown; retry?: () => void }>) {
  if (error) return <div><p role="alert">{error instanceof HttpNetworkError ? "Sin conexión. Tus datos no pudieron cargarse." : "No se pudieron cargar los datos."}</p><button type="button" onClick={retry}>Reintentar</button></div>;
  if (loading) return <p role="status">Cargando…</p>;
  return null;
}

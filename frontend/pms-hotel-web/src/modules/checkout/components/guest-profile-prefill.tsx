'use client';

import { useGuestProfile } from '@/modules/profile';
import { profileGuestPatch, type GuestDetails } from '../domain/guest-details';
import styles from './public-guest-data-page.module.css';

export function GuestProfilePrefill({ guest, onFill }: { guest: GuestDetails; onFill: (patch: Partial<GuestDetails>) => void }) {
  const profile = useGuestProfile();
  if (profile.error) return <div className={styles.loginBanner}><p>No pudimos cargar tu perfil. Puedes completar tus datos manualmente.</p><button type="button" onClick={profile.retry}>Reintentar</button></div>;
  if (profile.isPending) return <p className={styles.loginBanner} role="status">Cargando los datos de tu perfil…</p>;
  return <div className={styles.loginBanner}><p>Tu sesión está iniciada. Completa los campos vacíos con los datos de tu perfil.</p><button type="button" onClick={() => { if (profile.data) onFill(profileGuestPatch(profile.data, guest)); }}>Usar datos de mi cuenta</button></div>;
}

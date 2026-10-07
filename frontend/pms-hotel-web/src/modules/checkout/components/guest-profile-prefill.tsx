'use client';

import { useGuestProfile } from '@/modules/profile';
import { useAccountSummary } from '@/modules/account';
import { getPublicEnvironment } from '@/lib/env';
import { useEffect, useRef } from 'react';
import { profileGuestPatch, type GuestDetails, type GuestField } from '../domain/guest-details';
import styles from './public-guest-data-page.module.css';

interface PrefillProps { guest: GuestDetails; onFill: (patch: Partial<GuestDetails>) => void; editedFields?: ReadonlySet<GuestField> }
export function GuestProfilePrefill(props: PrefillProps) {
  return getPublicEnvironment().useMockApi ? <MockProfilePrefill {...props} /> : <AccountPrefill {...props} />;
}

function AccountPrefill({ guest, onFill, editedFields }: PrefillProps) {
  const summary = useAccountSummary();
  const fill = useRef(onFill);
  const hydratedSource = useRef('');
  useEffect(() => { fill.current = onFill; }, [onFill]);
  const account = summary.data?.source === 'real' ? summary.data : undefined;
  // Only the one explicitly linked profile; multiple profiles require a choice
  // that this contract does not yet offer. Email is still own-account data.
  const profile = account?.profiles.find(profile => profile.id === account.profileId && profile.status === 'ACTIVE');
  const firstName = profile?.firstName ?? '';
  const lastName = profile?.lastName ?? '';
  const email = account?.email ?? '';
  const source = account ? `${account.accountId}:${firstName}:${lastName}:${email}` : '';
  useEffect(() => {
    if (!source || hydratedSource.current === source) return;
    hydratedSource.current = source;
    const patch: Partial<GuestDetails> = {};
    for (const [field, value] of [['firstName', firstName], ['lastName', lastName], ['email', email]] as const) {
      if (!editedFields?.has(field) && !guest[field].trim() && value) patch[field] = value;
    }
    if (Object.keys(patch).length) fill.current(patch);
  }, [source, firstName, lastName, email, guest, editedFields]);
  if (summary.error) return <div className={styles.loginBanner}><p role="alert">No pudimos cargar tu perfil. Puedes completar tus datos manualmente.</p><button type="button" onClick={() => void summary.refetch()}>Reintentar</button></div>;
  if (summary.isPending) return <p className={styles.loginBanner} role="status">Cargando los datos de tu cuenta…</p>;
  return <p className={styles.loginBanner}>{profile ? 'Usamos los datos disponibles de tu cuenta. Completa los campos restantes.' : 'Completamos tu correo. Ingresa tu nombre, apellidos y los datos restantes.'}</p>;
}

function MockProfilePrefill({ guest, onFill }: { guest: GuestDetails; onFill: (patch: Partial<GuestDetails>) => void }) {
  const profile = useGuestProfile();
  if (profile.error) return <div className={styles.loginBanner}><p>No pudimos cargar tu perfil. Puedes completar tus datos manualmente.</p><button type="button" onClick={profile.retry}>Reintentar</button></div>;
  if (profile.isPending) return <p className={styles.loginBanner} role="status">Cargando los datos de tu perfil…</p>;
  return <div className={styles.loginBanner}><p>Tu sesión está iniciada. Completa los campos vacíos con los datos de tu perfil.</p><button type="button" onClick={() => { if (profile.data) onFill(profileGuestPatch(profile.data, guest)); }}>Usar datos de mi cuenta</button></div>;
}

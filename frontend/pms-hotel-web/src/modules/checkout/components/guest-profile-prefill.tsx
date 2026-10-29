'use client';

import { useGuestProfile,usePersonalProfile } from '@/modules/profile';
import {useGuestSession} from '@/modules/auth';
import { getPublicEnvironment } from '@/lib/env';
import { useEffect, useRef } from 'react';
import { profileGuestPatch, type GuestDetails, type GuestField } from '../domain/guest-details';
import styles from './public-guest-data-page.module.css';

interface PrefillProps { guest: GuestDetails; onFill: (patch: Partial<GuestDetails>) => void; editedFields?: ReadonlySet<GuestField> }
export function GuestProfilePrefill(props: PrefillProps) {
  return getPublicEnvironment().useMockApi ? <MockProfilePrefill {...props} /> : <AccountPrefill {...props} />;
}

function AccountPrefill({ guest, onFill, editedFields }: PrefillProps) {

  const query=usePersonalProfile();const {account}=useGuestSession();
  const fill=useRef(onFill),hydratedSource=useRef('');
  useEffect(()=>{fill.current=onFill;},[onFill]);
  const profile=query.data?.details?.values;
  const firstName=profile?.firstName??'',lastName=profile?.lastName??'',phone=profile?.phone??'';
  const email=query.data?.email??account?.email??'';
  const source=account ? [account.id,firstName,lastName,email,phone].join(':') : '';
  useEffect(()=>{
    if(!source || hydratedSource.current===source)return;
    hydratedSource.current=source;
    const patch=profileGuestPatch({firstName,lastName,email,phone,country:''},guest);
    for(const key of Object.keys(patch) as GuestField[])if(editedFields?.has(key))delete patch[key];
    // Never combine an account's phone with a dialing code the user already changed.
    if(editedFields?.has('phone')||editedFields?.has('phoneCode')){delete patch.phone;delete patch.phoneCode;}
    if(Object.keys(patch).length)fill.current(patch);
  },[source,firstName,lastName,email,phone,guest,editedFields]);
  if(query.error)return <div className={styles.loginBanner}><p role="alert">No pudimos cargar tu perfil. Puedes completar tus datos manualmente.</p><button type="button" onClick={()=>void query.refetch()}>Reintentar</button></div>;
  if(query.isPending)return <p className={styles.loginBanner} role="status">Cargando los datos de tu cuenta…</p>;
  return <p className={styles.loginBanner}>{profile?'Usamos los datos disponibles de tu cuenta. Completa los campos restantes.':'Completamos tu correo. Ingresa tu nombre, apellidos y los datos restantes.'}</p>;

}

function MockProfilePrefill({ guest, onFill }: { guest: GuestDetails; onFill: (patch: Partial<GuestDetails>) => void }) {
  const profile = useGuestProfile();
  if (profile.error) return <div className={styles.loginBanner}><p>No pudimos cargar tu perfil. Puedes completar tus datos manualmente.</p><button type="button" onClick={profile.retry}>Reintentar</button></div>;
  if (profile.isPending) return <p className={styles.loginBanner} role="status">Cargando los datos de tu perfil…</p>;
  return <div className={styles.loginBanner}><p>Tu sesión está iniciada. Completa los campos vacíos con los datos de tu perfil.</p><button type="button" onClick={() => { if (profile.data) onFill(profileGuestPatch(profile.data, guest)); }}>Usar datos de mi cuenta</button></div>;
}

"use client";
import { useRef, useState } from "react";
import { AccountFeedback, AccountSection } from "@/modules/account";
import { HttpNetworkError } from "@/lib/http/errors";
import { useGuestProfile } from "../hooks/use-guest-profile";
import type { GuestProfile } from "../model/profile";
import styles from "./profile-page.module.css";

export function ProfilePage() {
  const query = useGuestProfile();
  return <AccountSection title="Datos personales y preferencias" description="Edita tus datos de contacto y preferencias. El correo de acceso de tu cuenta no cambia al guardar este perfil.">
    <AccountFeedback loading={query.isPending} error={query.error} retry={query.retry} />
    {!query.error && query.data && <ProfileForm key={query.data.id} profile={query.data} mutation={query.mutation} />}
  </AccountSection>;
}
function ProfileForm({ profile, mutation }: { profile: GuestProfile; mutation: ReturnType<typeof useGuestProfile>["mutation"] }) {
  const [baseline, setBaseline] = useState(profile);
  const [draft, setDraft] = useState(profile);
  const [validation, setValidation] = useState<string | null>(null);
  const submitting = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  function change<K extends keyof GuestProfile>(key: K, value: GuestProfile[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setValidation(null);
    mutation.reset();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || submitting.current) return;
    if (![draft.firstName, draft.lastName, draft.email, draft.phone, draft.country].every(value => value.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) || !/^\+[\d ()-]{7,20}$/.test(draft.phone.trim())) {
      setValidation("Completa los campos y utiliza un correo válido y un teléfono con prefijo internacional (+).");
      return;
    }
    submitting.current = true;
    try {
      const saved = await mutation.mutateAsync(draft);
      setBaseline(saved);
      setDraft(saved);
    } catch { /* The mutation exposes a safe, recoverable error; preserve the draft. */ }
    finally { submitting.current = false; }
  }
  return <form className={styles.formGrid} onSubmit={save} aria-busy={mutation.isPending}>
    <fieldset className={styles.card} disabled={mutation.isPending}>
      <legend>Datos personales</legend>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label htmlFor="first-name">Nombre *</label><input id="first-name" autoComplete="given-name" required value={draft.firstName} onChange={e => change("firstName", e.target.value)} /></div>
        <div className={styles.field}><label htmlFor="last-name">Apellidos *</label><input id="last-name" autoComplete="family-name" required value={draft.lastName} onChange={e => change("lastName", e.target.value)} /></div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label htmlFor="contact-email">Correo de contacto *</label><input id="contact-email" autoComplete="email" type="email" required value={draft.email} onChange={e => change("email", e.target.value)} /></div>
        <div className={styles.field}><label htmlFor="phone">Teléfono *</label><input id="phone" autoComplete="tel" type="tel" required value={draft.phone} onChange={e => change("phone", e.target.value)} /></div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label htmlFor="country">País / región *</label><input id="country" autoComplete="country-name" required value={draft.country} onChange={e => change("country", e.target.value)} /></div>
        <div className={styles.field}><label htmlFor="language">Idioma preferido</label><select id="language" value={draft.preferredLanguage} onChange={e => change("preferredLanguage", e.target.value)}><option>Español</option><option>English</option></select></div>
      </div>
    </fieldset>
    <fieldset id="preferencias" className={styles.card} disabled={mutation.isPending}>
      <legend>Configuración y preferencias de estancia</legend>
      {([
        ["bedType", "Cama", ["King", "Queen", "Twin"]],
        ["roomVibe", "Habitación", ["tranquila", "vista exterior", "cerca de elevador"]],
        ["floorPreference", "Piso", ["Piso alto · evitar zonas ruidosas", "Piso bajo"]],
      ] as const).map(([key, label, options]) => <div className={styles.field} key={key}>
        <label htmlFor={key}>{label}</label><select id={key} value={draft.preferences[key]} onChange={e => change("preferences", { ...draft.preferences, [key]: e.target.value })}>{options.map(option => <option key={option}>{option}</option>)}</select>
      </div>)}
      <p>Privacidad: {profile.preferences.privacyLevel}</p>
      <p>Consentimiento revocable: {profile.preferences.revocableConsent ? "Sí" : "No"}</p>
      <p role="status">{mutation.isPending ? "Guardando…" : dirty ? "Tienes cambios sin guardar." : mutation.isSuccess ? "Perfil guardado correctamente." : "Sin cambios pendientes."}</p>
      {(validation || mutation.error) && <p role="alert">{validation ?? (mutation.error instanceof HttpNetworkError ? "Sin conexión. Conservamos tus cambios; intenta guardar de nuevo." : "No se pudo guardar. Conservamos tus cambios; puedes reintentar o cancelar.")}</p>}
      <button className={styles.submitButton} type="submit" disabled={!dirty || mutation.isPending}>Guardar cambios</button>
      <button type="button" disabled={!dirty || mutation.isPending} onClick={() => { setDraft(baseline); setValidation(null); mutation.reset(); }}>Cancelar cambios</button>
    </fieldset>
  </form>;
}

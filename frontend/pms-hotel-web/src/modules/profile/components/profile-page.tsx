"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./profile-page.module.css";

export function ProfilePage() {
  const [firstName, setFirstName] = useState("Alan");
  const [lastName, setLastName] = useState("Palacios");
  const [email, setEmail] = useState("alan@email.com");
  const [phone, setPhone] = useState("+502 5555 5555");
  const [country, setCountry] = useState("Guatemala");
  const [language, setLanguage] = useState("Español");

  // Preferencias de estancia
  const [bedType, setBedType] = useState("King");
  const [roomVibe, setRoomVibe] = useState("tranquila");
  const [floorPref, setFloorPref] = useState("Piso alto · evitar zonas ruidosas");

  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Hotel Boutique
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/habitaciones">Habitaciones</Link>
          <Link href="/amenidades">Amenidades</Link>
          <Link href="/mis-reservas">Mis reservas</Link>
          <Link className={styles.activeNav} href="/cuenta">
            Mi cuenta
          </Link>
        </nav>
      </header>

      <div className={styles.container}>
        <Link className={styles.backLink} href="/cuenta">
          ← Mi cuenta
        </Link>

        <p className={styles.eyebrow}>PERFIL Y PREFERENCIAS</p>
        <h1 className={styles.title}>Datos personales y preferencias</h1>
        <p className={styles.subtitle}>
          Edita tu perfil Guest y preferencias reutilizables. Validamos campos obligatorios y
          protegemos tus datos según la configuración de privacidad.
        </p>

        <form className={styles.formGrid} onSubmit={handleSubmit}>
          {/* Card Izquierda: Datos Personales */}
          <section className={styles.card}>
            <h2>Datos personales</h2>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="first-name">Nombre *</label>
                <input
                  autoComplete="given-name"
                  id="first-name"
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  type="text"
                  value={firstName}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="last-name">Apellidos *</label>
                <input
                  autoComplete="family-name"
                  id="last-name"
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  type="text"
                  value={lastName}
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="email">Correo electrónico *</label>
                <input
                  autoComplete="email"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="phone">Teléfono *</label>
                <input
                  autoComplete="tel"
                  id="phone"
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  type="tel"
                  value={phone}
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="country">País / región</label>
                <input
                  id="country"
                  onChange={(e) => setCountry(e.target.value)}
                  type="text"
                  value={country}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="language">Idioma preferido</label>
                <select
                  id="language"
                  onChange={(e) => setLanguage(e.target.value)}
                  value={language}
                >
                  <option value="Español">Español</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>
          </section>

          {/* Card Derecha: Preferencias de estancia */}
          <aside className={styles.card}>
            <h2>Preferencias de estancia</h2>

            <div className={styles.prefItem}>
              <p>Cama:</p>
              <div className={styles.prefBadges}>
                {["King", "Queen", "Twin"].map((type) => (
                  <button
                    className={`${styles.badgeSelect} ${
                      bedType === type ? styles.badgeSelectActive : ""
                    }`}
                    key={type}
                    onClick={() => setBedType(type)}
                    type="button"
                  >
                    {type} {bedType === type ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.prefItem}>
              <p>Habitación:</p>
              <div className={styles.prefBadges}>
                {["tranquila", "vista exterior", "cerca de elevador"].map((vibe) => (
                  <button
                    className={`${styles.badgeSelect} ${
                      roomVibe === vibe ? styles.badgeSelectActive : ""
                    }`}
                    key={vibe}
                    onClick={() => setRoomVibe(vibe)}
                    type="button"
                  >
                    {vibe} {roomVibe === vibe ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.prefItem}>
              <p>Piso:</p>
              <div className={styles.prefBadges}>
                {["Piso alto · evitar zonas ruidosas", "Piso bajo"].map((floor) => (
                  <button
                    className={`${styles.badgeSelect} ${
                      floorPref === floor ? styles.badgeSelectActive : ""
                    }`}
                    key={floor}
                    onClick={() => setFloorPref(floor)}
                    type="button"
                  >
                    {floor} {floorPref === floor ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.privacyBadge}>
              <span className={styles.fieldLabel}>Privacidad</span>
              <span className={styles.privacyTag}>SOLO CUENTA</span>
            </div>
            <p className={styles.consentText}>Consentimiento revocable</p>

            <button className={styles.submitButton} type="submit">
              Guardar cambios
            </button>

            {saved && (
              <output className={styles.statusOutput}>
                ¡Perfil y preferencias actualizados correctamente!
              </output>
            )}
          </aside>
        </form>

        <span className={styles.note}>
          Validación: nombre, apellidos, email y teléfono obligatorios · email válido · teléfono internacional.
          Privacidad: datos visibles solo para tu cuenta y personal autorizado.
        </span>
      </div>
    </main>
  );
}

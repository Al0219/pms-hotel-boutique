'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@/shared/components';
import { useGuestSession } from '@/modules/auth';
import { publicHotelContent, publicHotelInformation } from '../content/public-hotel-content';
import { BookingIcon } from './booking-icon';
import styles from './public-booking-shell.module.css';

export function PublicBookingShell({ children }: { children: ReactNode }) {
  const { account } = useGuestSession();
  const [information, setInformation] = useState<{ title: string; text: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const informationTrigger = useRef<HTMLButtonElement | null>(null);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const closeInformation = () => { setInformation(null); informationTrigger.current?.focus(); };
  const openInformation = (trigger: HTMLButtonElement, content: { title: string; text: string }) => {
    informationTrigger.current = trigger;
    setInformation(content);
  };

  return <div className={styles.shell}>
    <a href="#public-content" className={styles.skipLink}>Saltar al contenido</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Hotel Boutique, inicio">Hotel Boutique</Link>
        <button ref={menuTrigger} type="button" className={styles.menuToggle}
          aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? 'Cerrar menú' : 'Menú'}<span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
        <nav id="public-navigation" aria-label="Navegación pública" className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ''}`}
          onClick={() => setMenuOpen(false)} onKeyDown={event => {
            if (event.key === 'Escape') { setMenuOpen(false); menuTrigger.current?.focus(); }
          }}>
          <Link href="/habitaciones">Habitaciones</Link><Link href="/#amenidades">Amenidades</Link>
          <Link href={account ? '/mis-reservas' : '/acceso'}>Mis reservas</Link>
          <Link href={account ? '/cuenta' : '/acceso'}>{account ? 'Mi cuenta' : 'Iniciar sesión'}</Link>
        </nav>
      </div>
    </header>
    <main id="public-content" className={styles.main} tabIndex={-1}>{children}</main>
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerColumns}>
          <div className={styles.footerBrand}>
            <Link href="/">{publicHotelContent.name}</Link>
            <p>{publicHotelContent.description}</p>
            <span className={styles.locale}>{publicHotelContent.locale} <span aria-hidden="true">|</span> {publicHotelContent.currency}</span>
          </div>
          <nav aria-labelledby="footer-explore-title" className={styles.footerExplore}>
            <h2 id="footer-explore-title">Explorar</h2>
            <Link href="/habitaciones">Habitaciones &amp; Suites</Link>
            <Link href="/#amenidades">Amenidades &amp; Experiencias</Link>
            {(['gallery', 'offers', 'faq'] as const).map(key => <button key={key} type="button"
              onClick={event => openInformation(event.currentTarget, publicHotelInformation[key])}>
              {key === 'faq' ? 'Preguntas frecuentes (FAQ)' : publicHotelInformation[key].title}
            </button>)}
          </nav>
          <section className={styles.footerContact} aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title">Contacto &amp; Ubicación</h2>
            <address>
              <p><BookingIcon name="location" /><span>{publicHotelContent.contact.address}</span></p>
              <p><BookingIcon name="phone" /><span>{publicHotelContent.contact.phone}</span></p>
              <p><BookingIcon name="mail" /><span>{publicHotelContent.contact.email}</span></p>
            </address>
            {publicHotelContent.contact.isDemo && <button type="button" className={styles.demoContact}
              onClick={event => openInformation(event.currentTarget, publicHotelInformation.contact)}>Datos de demostración</button>}
          </section>
          <section className={styles.footerSocial} aria-labelledby="footer-social-title">
            <h2 id="footer-social-title">Síguenos</h2><p>{publicHotelContent.socialIntroduction}</p>
            <div className={styles.socialLinks}>
              {publicHotelContent.socialProfiles.map(profile => profile.url
                ? <a href={profile.url} key={profile.name} aria-label={profile.name} target="_blank" rel="noopener noreferrer"><BookingIcon name={profile.icon} /></a>
                : <button key={profile.name} type="button" aria-label={profile.name} onClick={event => openInformation(event.currentTarget, {
                  title: profile.name, text: `El perfil de ${profile.name} del hotel está pendiente de configuración. Este botón forma parte de la demostración.`,
                })}><BookingIcon name={profile.icon} /></button>)}
            </div>
          </section>
        </div>
        <div className={styles.footerBottom}>
          <p>© {publicHotelContent.copyrightYear} {publicHotelContent.name}. Todos los derechos reservados.</p>
          <nav aria-label="Información legal" className={styles.footerLinks}>
            {(['privacy', 'terms', 'cookies'] as const).map(key => <button key={key} type="button"
              onClick={event => openInformation(event.currentTarget, publicHotelInformation[key])}>{publicHotelInformation[key].title}</button>)}
          </nav>
        </div>
      </div>
    </footer>
    {information && <div className={styles.modalLayer}><Modal title={information.title} onClose={closeInformation}
      footer={<Button onClick={closeInformation}>Cerrar</Button>}><p>{information.text}</p></Modal></div>}
  </div>;
}

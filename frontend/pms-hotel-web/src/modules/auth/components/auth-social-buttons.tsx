import type { AuthMode } from '../model/guest-credentials';
import styles from './guest-access-page.module.css';

export type SocialAccessProvider = 'GOOGLE';

function GoogleIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.5l-3.3-2.6c-.9.6-2.1.9-3.5.9-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.3 13.6a6 6 0 0 1 0-3.2V7.7H2.9a10 10 0 0 0 0 8.6l3.4-2.7Z" /><path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 2.9 7.7l3.4 2.7c.8-2.4 3.1-4.2 5.7-4.2Z" /></svg>;
}

export function AuthSocialButtons({ mode, disabled, pendingProvider, onAccess }: {
  mode: AuthMode; disabled: boolean; pendingProvider?: SocialAccessProvider; onAccess: (provider: SocialAccessProvider) => void;
}) {
  return <div className={styles.socialOptions}>
    <button className={styles.google} type="button" disabled={disabled} onClick={() => onAccess('GOOGLE')}>
      {pendingProvider === 'GOOGLE' ? <><span className={styles.spinner} aria-hidden="true" />Conectando…</> : <><GoogleIcon />{mode === 'register' ? 'Registrarse' : 'Continuar'} con Google</>}
    </button>
  </div>;
}

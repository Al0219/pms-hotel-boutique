'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {getPublicEnvironment} from '@/lib/env';
import styles from './account-navigation.module.css';
export function AccountNavigation(){
  const pathname=usePathname();
  if(getPublicEnvironment().useMockApi)return null;
  const links=[['/cuenta','Resumen'],['/cuenta/perfil','Mi perfil'],['/cuenta/reservas','Reservas e historial'],['/cuenta/reservas/vincular','Vincular reserva']];
  return <div className={styles.wrap}><nav className={styles.nav} aria-label="Navegación de mi cuenta"><div className={styles.links}>{links.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href || (href==='/cuenta/reservas' && pathname.startsWith('/cuenta/reservas/') && pathname!=='/cuenta/reservas/vincular')?'page':undefined}>{label}</Link>)}</div></nav></div>;
}

import type { CSSProperties } from 'react';

export function SvgIcon({ name, className, style }: {
  name: 'dashboard' | 'reservations' | 'room' | 'logout' | 'calendar' | 'guests' | 'account' | 'arrow' | 'chevron' | 'location' | 'phone' | 'mail' | 'facebook' | 'x' | 'instagram' | 'cart' | 'check';
  className?: string;
  style?: CSSProperties;
}) {
  return <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'dashboard' && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
    {name === 'reservations' && <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6m-6 5 2 2 4-4" /></>}
    {name === 'room' && <><path d="M3 18V6m18 12v-7H3m0 4h18M3 18v3m18-3v3" /><path d="M7 11V7h6v4" /></>}
    {name === 'logout' && <><path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4" /></>}
    {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18" /></>}
    {name === 'guests' && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5.2" /></>}
    {name === 'account' && <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>}
    {name === 'arrow' && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === 'chevron' && <path d="m6 9 6 6 6-6" />}
    {name === 'cart' && <><path d="M2 3h3l3 13h11l3-10H6" /><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /></>}
    {name === 'check' && <path d="m5 12 4 4L19 6" />}
    {name === 'location' && <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>}
    {name === 'phone' && <path d="M5 3H3v3c0 8.3 6.7 15 15 15h3v-3l-5-2-2 2a13 13 0 0 1-8-8l2-2-2-5Z" />}
    {name === 'mail' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
    {name === 'facebook' && <path d="M14 21v-8h3l.5-4H14V7c0-1 .5-2 2-2h2V2h-3c-3 0-5 2-5 5v2H7v4h3v8" />}
    {name === 'x' && <><path d="m4 3 12 18h4L8 3Z" /><path d="m20 3-6.5 8M4 21l6.5-8" /></>}
    {name === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" /></>}
  </svg>;
}

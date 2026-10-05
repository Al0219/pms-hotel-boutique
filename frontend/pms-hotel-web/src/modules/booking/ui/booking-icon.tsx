import type { CSSProperties } from 'react';

export function BookingIcon({ name, className, style }: {
  name: 'calendar' | 'guests' | 'arrow' | 'chevron' | 'location' | 'phone' | 'mail' | 'facebook' | 'x' | 'instagram' | 'cart' | 'check';
  className?: string;
  style?: CSSProperties;
}) {
  return <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18" /></>}
    {name === 'guests' && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5.2" /></>}
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

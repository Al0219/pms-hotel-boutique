import { PublicBookingProvider, PublicBookingShell } from '@/modules/booking';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicBookingProvider><PublicBookingShell>{children}</PublicBookingShell></PublicBookingProvider>;
}

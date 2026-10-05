import { PublicBookingShell } from '@/modules/booking';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicBookingShell>{children}</PublicBookingShell>;
}

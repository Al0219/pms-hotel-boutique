import { PublicBookingProvider, PublicBookingShell } from '@/modules/booking';
import { CheckoutDraftProvider } from '@/modules/checkout';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicBookingProvider><CheckoutDraftProvider><PublicBookingShell>{children}</PublicBookingShell></CheckoutDraftProvider></PublicBookingProvider>;
}

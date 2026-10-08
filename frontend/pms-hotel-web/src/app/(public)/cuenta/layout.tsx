'use client';

import { usePathname } from 'next/navigation';
import { GuestAccountGate } from "@/modules/auth";

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return <GuestAccountGate returnTo={pathname === '/cuenta/reservas/vincular' ? pathname : undefined}>{children}</GuestAccountGate>;
}

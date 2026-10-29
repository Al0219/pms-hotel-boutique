'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffSession } from '@/modules/auth';
import { staffSafeDestination } from '../model/staff-navigation';

export function StaffAdminAccessBoundary({ children }: { children: ReactNode }) {
  const session = useStaffSession();
  return session.permissions.includes('STAFF_MANAGE') ? children : <DeniedStaff destination={staffSafeDestination(session)} />;
}
function DeniedStaff({ destination }: { destination: string }) {
  const router = useRouter(), redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    router.replace(destination);
  }, [destination, router]);
  return null;
}

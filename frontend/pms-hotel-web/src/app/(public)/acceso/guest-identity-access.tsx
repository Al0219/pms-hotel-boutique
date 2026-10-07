'use client';
import { GuestAccessPage } from '@/modules/auth';
export function GuestIdentityAccess({ returnTo, googleError }: { returnTo?: string; googleError?: boolean }) {
  return <GuestAccessPage returnTo={returnTo} googleError={googleError} />;
}

'use client';
import { GuestAccessPage } from '@/modules/auth';
export function GuestIdentityAccess({ returnTo, googleError, pendingRequestId, afterStaffActivation }: { returnTo?: string; googleError?: boolean; pendingRequestId?:string; afterStaffActivation?:boolean }) {
  return <GuestAccessPage afterStaffActivation={afterStaffActivation} pendingRequestId={pendingRequestId} returnTo={returnTo} googleError={googleError} />;
}

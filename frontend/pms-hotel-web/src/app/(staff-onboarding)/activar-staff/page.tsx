import type { Metadata } from 'next';
import { StaffInvitationPage } from '@/modules/staff';
export const metadata: Metadata = { title: 'Preparar acceso Staff', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function Page() { return <StaffInvitationPage />; }

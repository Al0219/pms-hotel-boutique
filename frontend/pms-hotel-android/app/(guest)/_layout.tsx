import { Stack } from 'expo-router';

import { GuestNavigationMenuProvider, GuestNoticeProvider } from '@/modules/navigation';
import { SessionServiceRequestsProvider } from '@/modules/service-requests';
import { SessionVehiclesProvider } from '@/modules/valet';

export default function GuestLayout() {
  return <GuestNavigationMenuProvider><GuestNoticeProvider><SessionServiceRequestsProvider><SessionVehiclesProvider><Stack screenOptions={{ headerShown: false }} /></SessionVehiclesProvider></SessionServiceRequestsProvider></GuestNoticeProvider></GuestNavigationMenuProvider>;
}

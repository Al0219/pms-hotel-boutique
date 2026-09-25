import { Stack } from 'expo-router';

import { GuestNavigationMenuProvider, GuestNoticeProvider } from '@/modules/navigation';
import { SessionServiceRequestsProvider } from '@/modules/service-requests';
import { SessionVehiclesProvider } from '@/modules/valet';
import { CheckoutSessionProvider } from '@/modules/checkout/presentation/CheckoutSessionProvider';

export default function GuestLayout() {
  return <GuestNoticeProvider><SessionServiceRequestsProvider><CheckoutSessionProvider><GuestNavigationMenuProvider><SessionVehiclesProvider><Stack screenOptions={{ headerShown: false }} /></SessionVehiclesProvider></GuestNavigationMenuProvider></CheckoutSessionProvider></SessionServiceRequestsProvider></GuestNoticeProvider>;
}

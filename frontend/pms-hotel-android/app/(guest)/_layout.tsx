import { Stack } from "expo-router";

import { CheckoutSessionProvider } from "@/modules/checkout/presentation/CheckoutSessionProvider";
import { useActiveReservationContext } from "@/modules/guest-auth";
import {
  GuestNavigationMenuProvider,
  GuestNoticeProvider,
} from "@/modules/navigation";
import { SessionServiceRequestsProvider } from "@/modules/service-requests";
import { SessionVehiclesProvider } from "@/modules/valet";

function ContextScopedGuestState() {
  const { activeReservationContext } = useActiveReservationContext();
  const contextKey =
    activeReservationContext?.reservationStayId ?? "no-active-stay";
  return (
    <GuestNoticeProvider key={contextKey}>
      <SessionServiceRequestsProvider>
        <CheckoutSessionProvider>
          <GuestNavigationMenuProvider>
            <SessionVehiclesProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </SessionVehiclesProvider>
          </GuestNavigationMenuProvider>
        </CheckoutSessionProvider>
      </SessionServiceRequestsProvider>
    </GuestNoticeProvider>
  );
}

/** Local request, vehicle, checkout and notice state is remounted for every active stay. */
export default function GuestLayout() {
  return <ContextScopedGuestState />;
}

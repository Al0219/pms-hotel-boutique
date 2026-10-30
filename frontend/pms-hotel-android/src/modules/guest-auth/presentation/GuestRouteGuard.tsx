import { environment } from "@/config/environment";
import { UniversalState } from "@/shared/components/UniversalState";

import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { type PropsWithChildren, useEffect } from "react";

import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";

import { reservationsDestination, valetContinuation } from './guestContinuation';

function destination(
  pathname: string,
  hasSession: boolean,
  hasContext: boolean,
): string | null {
  if (pathname === "/" || pathname === "/login" || pathname === "/access")
    return null;
  if (pathname === "/reservations") return hasSession ? null : "/login";
  if (pathname === "/account/profile" || pathname === "/account/rewards")
    return hasSession ? null : "/login";

  const requiresContext =
    pathname === "/account" ||
    pathname === "/account/checkout" ||
    pathname === "/account/invoice" ||
    pathname === "/services" ||
    pathname.startsWith("/services/") ||
    pathname === "/valet" || pathname === "/hotel" || pathname === "/account/promotions";
  if (!requiresContext || hasContext) return null;
  return hasSession ? "/reservations" : "/login";
}

/** Prevents protected route content from mounting without the identity it requires. */
export function GuestRouteGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { returnTo } = useGlobalSearchParams();
  const continuation = valetContinuation(pathname === "/valet" ? pathname : returnTo);
  const { session } = useGuestAuthSession();
  const { activeReservationContext, clearActiveReservationContext } = useActiveReservationContext();
  const redirect = destination(
    pathname,
    Boolean(session),
    Boolean(activeReservationContext) && (environment.useMockApi || Boolean(session)),
  );

  useEffect(() => {
    if (!environment.useMockApi && !session) clearActiveReservationContext();
  }, [session, clearActiveReservationContext]);
  useEffect(() => {
    if (!environment.useMockApi && session && (pathname === '/login' || pathname === '/')) {
      router.replace(continuation && activeReservationContext ? continuation : reservationsDestination(continuation));
    }
  }, [pathname, session, activeReservationContext, continuation]);

  useEffect(() => {
    if (redirect === '/reservations') router.replace(reservationsDestination(continuation));
    else if (redirect === '/login' && continuation) router.replace({ pathname: '/login', params: { returnTo: continuation } });
    else if (redirect) router.replace(redirect);
  }, [redirect, continuation]);

  if (redirect) return null;
  if (!environment.useMockApi && !['/', '/login', '/reservations', '/account', '/account/checkout', '/account/invoice', '/services', '/services/housekeeping', '/services/room-service', '/services/amenities', '/services/requests', '/valet', '/hotel', '/account/profile', '/account/rewards', '/account/promotions'].includes(pathname)) {
    return <UniversalState kind="empty" title="Función no disponible" body="Esta función todavía no está disponible. Puedes consultar tus estadías." action={{ label: 'Volver', onPress: () => router.replace(session ? '/reservations' : '/login') }} testID="guest-real-feature-unavailable" />;
  }
  return children;
}

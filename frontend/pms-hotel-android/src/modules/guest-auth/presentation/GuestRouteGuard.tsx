import { environment } from "@/config/environment";
import { UniversalState } from "@/shared/components/UniversalState";

import { router, usePathname } from "expo-router";
import { type PropsWithChildren, useEffect } from "react";

import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";

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
    pathname === "/valet";
  if (!requiresContext || hasContext) return null;
  return hasSession ? "/reservations" : "/login";
}

/** Prevents protected route content from mounting without the identity it requires. */
export function GuestRouteGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
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
    if (!environment.useMockApi && session && (pathname === '/login' || pathname === '/')) router.replace('/reservations');
  }, [pathname, session]);

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect]);

  if (redirect) return null;
  if (!environment.useMockApi && !['/', '/login', '/reservations', '/account', '/services', '/services/housekeeping', '/services/requests'].includes(pathname)) {
    return <UniversalState kind="empty" title="Función no disponible" body="Esta función todavía no está disponible. Puedes consultar tus estadías." action={{ label: 'Volver', onPress: () => router.replace(session ? '/reservations' : '/login') }} testID="guest-real-feature-unavailable" />;
  }
  return children;
}

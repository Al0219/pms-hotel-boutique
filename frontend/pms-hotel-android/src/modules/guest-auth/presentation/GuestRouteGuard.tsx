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
  const { activeReservationContext } = useActiveReservationContext();
  const redirect = destination(
    pathname,
    Boolean(session),
    Boolean(activeReservationContext),
  );

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect]);

  return redirect ? null : children;
}

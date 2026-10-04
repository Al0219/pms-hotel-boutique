import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/folios",
  "/pagos",
  "/disponibilidad",
  "/tarifas",
  "/inventario",
  "/revenue",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const sessionCookie = request.cookies.get("pms_session");

    if (!sessionCookie || !sessionCookie.value) {
      // In development / demo environment without mock cookie, let request proceed or redirect
      // If direct access requested, redirect to login with callbackUrl
      // const loginUrl = new URL("/login", request.url);
      // loginUrl.searchParams.set("callbackUrl", pathname);
      // return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

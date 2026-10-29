"use client";
import { usePathname } from "next/navigation";
import { StaffSessionProvider } from "@/modules/auth";
import { StaffAdminAccessBoundary } from "@/modules/staff";
import { PropertyProvider } from "@/modules/properties";
import { StaffShell } from "./staff-shell";
export default function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const adminUsers = pathname === "/seguridad/usuarios" || !!pathname?.startsWith("/seguridad/usuarios/");
  return <StaffSessionProvider signedOutRedirect={adminUsers ? "/acceso" : "/"} requireFreshSession={adminUsers}><PropertyProvider><StaffShell>{adminUsers ? <StaffAdminAccessBoundary>{children}</StaffAdminAccessBoundary> : children}</StaffShell></PropertyProvider></StaffSessionProvider>;
}

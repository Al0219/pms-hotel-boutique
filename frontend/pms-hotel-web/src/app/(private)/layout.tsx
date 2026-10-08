import { StaffSessionProvider } from "@/modules/auth";
import { PropertyProvider } from "@/modules/properties";
import { StaffShell } from "./staff-shell";
export default function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StaffSessionProvider><PropertyProvider><StaffShell>{children}</StaffShell></PropertyProvider></StaffSessionProvider>;
}

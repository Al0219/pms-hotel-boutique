import { GuestAccountGate } from "@/modules/auth";

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <GuestAccountGate>{children}</GuestAccountGate>;
}

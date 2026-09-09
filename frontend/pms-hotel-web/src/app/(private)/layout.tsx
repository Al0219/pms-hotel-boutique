export default function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><aside aria-label="Private shell sidebar" /><header aria-label="Private shell header" /><main>{children}</main></>;
}

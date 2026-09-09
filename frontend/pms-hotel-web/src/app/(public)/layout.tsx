export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><header aria-label="Public shell header" /><main>{children}</main><footer aria-label="Public shell footer" /></>;
}

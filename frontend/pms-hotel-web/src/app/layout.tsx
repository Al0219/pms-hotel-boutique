import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "PMS Hotel Boutique",
  description: "Technical application shell",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${inter.variable} ${lora.variable}`}><Providers>{children}</Providers></body></html>;
}

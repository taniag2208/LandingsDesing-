import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "TITA Landing Studio", template: "%s · TITA Landing Studio" },
  description: "Imagina. Personaliza. Publica. Landings promocionales y transaccionales conectadas a tu ecommerce.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0a16" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

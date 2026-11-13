import type { Metadata, Viewport } from "next";
import { Anton, Cormorant_Garamond, Italianno, Montserrat, Tangerine } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

// Tangerine yalnızca latin alt kümesini sunuyor (ş, ğ, İ yok).
// Aynı görsel aileden Italianno latin-ext ile yedek olarak yüklenir.
const tangerine = Tangerine({
  variable: "--font-tangerine",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const italianno = Italianno({
  variable: "--font-italianno",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.shopName ? `${settings.shopName} · Randevu` : "Randevu",
    description: `${settings.tagline} Online randevu alın, randevunuzu sorgulayın veya iptal edin.`,
    icons: { icon: settings.faviconImage || "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${montserrat.variable} ${cormorant.variable} ${anton.variable} ${tangerine.variable} ${italianno.variable}`}
    >
      <body className="min-h-dvh bg-cream text-ink">{children}</body>
    </html>
  );
}

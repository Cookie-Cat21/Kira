import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Noto_Sans_Sinhala } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CartDrawer from "./components/CartDrawer";
import FloatingCartButton from "./components/FloatingCartButton";
import KiraDock from "./components/store/KiraDock";
import { CartProvider } from "./context/CartContext";
import { KiraDockProvider } from "./context/KiraDockContext";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Kapruka — Gifting, reimagined with Kira",
  description:
    "Sri Lanka's gifting destination. Cakes, flowers, hampers and more — delivered islandwide, with Kira, your AI shopping companion, built in.",
  openGraph: {
    title: "Kapruka — Gifting, reimagined with Kira",
    description: "Shop Sri Lanka's favourites, or just ask Kira. Delivered islandwide.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#402970",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${notoSinhala.variable} h-full antialiased`}
    >
      <body className="h-full font-sans">
        <CartProvider>
          <KiraDockProvider>
            <CartDrawer />
            <FloatingCartButton />
            {children}
            <KiraDock />
          </KiraDockProvider>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}

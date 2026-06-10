import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Noto_Sans_Sinhala } from "next/font/google";
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
  title: "Kira — Kapruka's AI shopping companion",
  description:
    "Tell Kira who it's for, your budget, and where it needs to go — she finds the gift, checks delivery, and checks you out. Live Kapruka catalog, islandwide.",
  openGraph: {
    title: "Kira — Kapruka's AI shopping companion",
    description: "Shopping, by conversation. Live Kapruka catalog, real delivery, checkout in the chat.",
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
      </body>
    </html>
  );
}

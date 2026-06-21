import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Noto_Sans_Sinhala, Geist } from "next/font/google";
import CartDrawer from "./components/CartDrawer";
import KiraDock from "./components/store/KiraDock";
import { CartProvider } from "./context/CartContext";
import { KiraDockProvider } from "./context/KiraDockContext";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
      className={cn("h-full", "antialiased", dmSerif.variable, notoSinhala.variable, "font-sans", geist.variable)}
    >
      <body className="h-full font-sans">
        <CartProvider>
          <KiraDockProvider>
            <CartDrawer />
            {children}
            <KiraDock />
            <Toaster position="top-center" richColors />
          </KiraDockProvider>
        </CartProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Noto_Sans_Sinhala } from "next/font/google";
import CartDrawer from "./components/CartDrawer";
import FloatingCartButton from "./components/FloatingCartButton";
import { CartProvider } from "./context/CartContext";
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
  title: "Kira — Shop Sri Lanka",
  description:
    "Kira is Sri Lanka's first AI shopping companion. Find the perfect gift, check delivery, and checkout — all in one conversation.",
  openGraph: {
    title: "Kira — Shop Sri Lanka",
    description: "Sri Lanka's first AI shopping companion, powered by Kapruka.",
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
          <CartDrawer />
          <FloatingCartButton />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

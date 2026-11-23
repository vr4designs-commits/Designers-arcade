import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Rubik, Silkscreen } from "next/font/google";
import laws from "@/content/laws.json";
import "./globals.css";

// Each font is exposed as a CSS variable; globals.css and the download canvas in public/arcade.js read them.
const rubik = Rubik({ weight: "900", style: "italic", subsets: ["latin"], variable: "--font-rubik" });
const silkscreen = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-silkscreen" });
const pixelify = Pixelify_Sans({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-pixelify" });

export const metadata: Metadata = {
  title: "Design Arcade",
  description:
    `A pixel arcade for designers: ${laws.length} UX laws, heuristics and psychology principles as a quiz, plus contrast, type scale and layout grid tools.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c78ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rubik.variable} ${silkscreen.variable} ${pixelify.variable}`}>
      <body className="start" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

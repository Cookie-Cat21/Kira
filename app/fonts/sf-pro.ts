import localFont from "next/font/local";

/**
 * Self-hosted SF Pro Text (subset WOFF2).
 * Generated via `npm run setup:fonts` from Apple's official SF-Pro.dmg.
 * Falls back to system-ui in CSS if files are missing.
 */
export const sfPro = localFont({
  src: [
    {
      path: "./sf-pro/SF-Pro-Text-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./sf-pro/SF-Pro-Text-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./sf-pro/SF-Pro-Text-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./sf-pro/SF-Pro-Text-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sf-pro",
  display: "swap",
  preload: true,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

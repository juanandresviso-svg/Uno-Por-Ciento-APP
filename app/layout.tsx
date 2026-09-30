import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uno por Ciento",
  description: "Hábitos, tareas y finanzas personales",
  applicationName: "Uno por Ciento",
  appleWebApp: { capable: true, title: "1%", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a100e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

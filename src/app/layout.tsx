import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Zovik AI – AI Companion Chat with Voice, Video & Characters",
  description: "Your realistic AI companion is ready to chat, connect, and explore in ways that feel genuine. Meet realistic and anime characters designed to match your vibe.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d0a0f",
};

import PwaRegister from "@/components/PwaRegister";
import { AnnouncementBar } from "@/components/AnnouncementBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#0d0a0f] text-white antialiased selection:bg-[#f53b70] selection:text-white"
        suppressHydrationWarning
      >
        <PwaRegister />
        <AuthProvider>
          <AnnouncementBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

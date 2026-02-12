import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Teko } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CinematicShell } from "./CinematicShell";
import { TelemetryProvider } from "@/components/cinematic/Telemetry";
import { QualityToggle } from "@/components/cinematic/QualityToggle";
import { NavBar, Logo, StatusChips } from "@/components/NavBar";
import { MobileNav } from "@/components/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const teko = Teko({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fan Impact Engine",
  description: "OSU-themed MVP to simulate fan impact, loudness, and concessions outcomes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${teko.variable} antialiased`}
      >
        <Providers>
          <TelemetryProvider>
            <div className="app-shell min-h-screen">
              <header className="sticky top-0 z-50">
                <div className="glass border-b border-white/10">
                  <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-8">
                      <Logo />
                      <NavBar />
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4">
                      <QualityToggle />
                      <StatusChips />
                      <MobileNav />
                    </div>
                  </div>
                  <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[hsl(var(--scarlet))] to-transparent opacity-70" />
                </div>
              </header>
              <main className="relative z-10 mx-auto max-w-7xl px-5 py-10">
                <CinematicShell>{children}</CinematicShell>
              </main>
            </div>
          </TelemetryProvider>
        </Providers>
      </body>
    </html>
  );
}

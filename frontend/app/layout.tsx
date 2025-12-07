import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Checker d'accès web",
  description:
    "Vérifiez en direct l'accessibilité de vos sites web depuis votre réseau.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 overflow-y-auto">
            <TopBar />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

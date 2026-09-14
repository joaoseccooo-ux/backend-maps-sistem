import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Buscador de Leads",
  description: "Gestão de leads locais para prospecção de sites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-muted/30 font-sans antialiased">
        <AppHeader />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

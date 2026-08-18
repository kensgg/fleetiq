import type { Metadata } from "next";
import { Lato } from "next/font/google";
import Chatbot from "@/components/chatbot/Chatbot";
import "./globals.css";

const lato = Lato({
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FleetIQ — Gestión de Flotillas",
  description: "Plataforma SaaS para gestión de flotillas de transporte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${lato.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <div className="ambient-bg" aria-hidden="true" />
        
        {children}
        
        {/* Widget del Chatbot global */}
        <Chatbot />
      </body>
    </html>
  );
}


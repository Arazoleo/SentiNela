import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENTINELA — Vigilância Epidemiológica Inteligente",
  description: "Assistente sindrômico com IA para previsão de epidemias e pandemias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-sentinela grid-bg min-h-screen text-[#d4edda]">
        {children}
      </body>
    </html>
  );
}

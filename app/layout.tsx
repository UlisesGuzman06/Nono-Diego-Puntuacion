import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nono Diego - Sistema de Puntos",
  description: "Sistema de puntos de fidelidad para pizzería Nono Diego",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

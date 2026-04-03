import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Athlevo Admin",
  description: "Athlevo antrenman programları yönetim paneli",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

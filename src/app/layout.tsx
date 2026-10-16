import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "সততা | Sotota",
  description: "বাংলাদেশে অনলাইনে শুটকি মাছ কিনুন।",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
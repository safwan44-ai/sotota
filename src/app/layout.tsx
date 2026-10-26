import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The proxy tells us which page this is. Admin pages have their own look.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body className="font-sans antialiased">
        {inAdmin ? (
          children
        ) : (
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        )}
      </body>
    </html>
  );
}
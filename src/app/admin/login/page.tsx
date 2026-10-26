import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "অ্যাডমিন লগইন | সততা",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Already logged in? Go straight to the dashboard.
  if (await getAdmin()) redirect("/admin/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-2xl font-bold text-forest">
        সততা · অ্যাডমিন
      </h1>
      <p className="mt-2 text-center text-sm text-charcoal/70">
        শুধু অনুমোদিত ব্যক্তির জন্য।
      </p>
      <LoginForm />
    </main>
  );
}
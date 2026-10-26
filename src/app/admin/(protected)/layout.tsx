import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/actions/admin-auth";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "অ্যাডমিন | সততা ফুডস",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-forest text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/admin/dashboard" className="font-bold">
              সততা ফুডস · অ্যাডমিন
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/dashboard" className="hover:underline">
                ড্যাশবোর্ড
              </Link>
              <Link href="/admin/orders" className="hover:underline">
                অর্ডার
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">{admin.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10"
              >
                লগআউট
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
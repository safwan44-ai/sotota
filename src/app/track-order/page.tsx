import type { Metadata } from "next";
import Link from "next/link";
import TrackOrderForm from "@/components/TrackOrderForm";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক | সততা",
  description: "অর্ডার নম্বর ও ফোন নম্বর দিয়ে আপনার অর্ডারের অবস্থা দেখুন।",
};

export default function TrackOrderPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <nav className="text-sm text-charcoal/70">
        <Link href="/" className="hover:underline">
          হোম
        </Link>{" "}
        / <span>অর্ডার ট্র্যাক</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-forest">অর্ডার ট্র্যাক</h1>
      <p className="mt-2 text-charcoal/80">
        অর্ডার নম্বর ও অর্ডারের সময় দেওয়া মোবাইল নম্বর লিখুন। দুটোই মিললে অর্ডারের
        অবস্থা দেখতে পাবেন।
      </p>

      <TrackOrderForm />
    </main>
  );
}
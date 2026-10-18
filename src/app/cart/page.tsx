import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = { title: "কার্ট | সততা" };

export default function CartPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-forest">আপনার কার্ট</h1>
      <CartView />
    </main>
  );
}
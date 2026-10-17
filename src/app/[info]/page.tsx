import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { infoPages } from "@/lib/site";

type Props = { params: Promise<{ info: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { info } = await params;
  const page = infoPages.find((p) => p.slug === info);
  return { title: page ? `${page.title} | সততা` : "পাতা পাওয়া যায়নি | সততা" };
}

export default async function InfoPage({ params }: Props) {
  const { info } = await params;
  const page = infoPages.find((p) => p.slug === info);

  if (!page) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <nav className="text-sm text-charcoal/70">
        <Link href="/" className="hover:underline">
          হোম
        </Link>{" "}
        / <span>{page.title}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-forest">{page.title}</h1>

      {/* Real content for each page is added later. */}
      <p className="mt-6 rounded-lg border border-craft/30 bg-white p-6">
        এই পাতার তথ্য শীঘ্রই যোগ করা হবে।
      </p>
    </main>
  );
}
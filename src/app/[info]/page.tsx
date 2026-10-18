import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { infoPages } from "@/lib/pages";
import { site } from "@/lib/site";

type Props = { params: Promise<{ info: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { info } = await params;
  const page = infoPages.find((p) => p.slug === info);
  if (!page) return { title: "পাতা পাওয়া যায়নি | সততা" };
  return { title: `${page.title} | সততা`, description: page.intro };
}

type ContactItem = { label: string; value: string; href?: string };

function ContactDetails() {
  const items: ContactItem[] = [];

  if (site.phone) {
    items.push({ label: "ফোন", value: site.phone, href: `tel:${site.phone}` });
  }
  if (site.whatsapp) {
    items.push({
      label: "হোয়াটসঅ্যাপ",
      value: site.whatsapp,
      href: `https://wa.me/${site.whatsapp.replace(/\D/g, "")}`,
    });
  }
  if (site.email) {
    items.push({
      label: "ইমেইল",
      value: site.email,
      href: `mailto:${site.email}`,
    });
  }
  if (site.address) {
    items.push({ label: "ঠিকানা", value: site.address });
  }
  if (site.facebookUrl) {
    items.push({
      label: "ফেসবুক",
      value: site.facebookUrl,
      href: site.facebookUrl,
    });
  }
  if (site.instagramUrl) {
    items.push({
      label: "ইনস্টাগ্রাম",
      value: site.instagramUrl,
      href: site.instagramUrl,
    });
  }

  return (
    <dl className="mt-6 divide-y divide-craft/20 rounded-xl border border-craft/30 bg-white">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6"
        >
          <dt className="w-32 shrink-0 text-sm font-medium text-forest">
            {item.label}
          </dt>
          <dd className="break-words text-charcoal">
            {item.href ? (
              <a
                href={item.href}
                className="hover:underline"
                {...(item.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
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

      {page.intro && (
        <p className="mt-4 text-lg leading-8 text-charcoal/80">{page.intro}</p>
      )}

      {page.slug === "contact" && <ContactDetails />}

      {page.sections.map((s, i) => (
        <section key={i} className="mt-8">
          {s.heading && (
            <h2 className="text-xl font-semibold text-forest">{s.heading}</h2>
          )}

          {s.paragraphs?.map((text, j) => (
            <p key={j} className="mt-3 leading-8 text-charcoal/90">
              {text}
            </p>
          ))}

          {s.list && (
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-8 text-charcoal/90">
              {s.list.map((text, j) => (
                <li key={j}>{text}</li>
              ))}
            </ul>
          )}

          {s.steps && (
            <ol className="mt-3 [list-style-type:bengali] space-y-3 pl-6 leading-8 text-charcoal/90">
              {s.steps.map((text, j) => (
                <li key={j}>{text}</li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </main>
  );
}
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { site } from "@/lib/site"; import { infoPages } from "@/lib/pages";

async function getCategories() {
  try {
    return await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, nameBn: true },
    });
  } catch {
    // If the database is down, the footer must still show.
    return [];
  }
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </a>
  );
}

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-white hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Footer() {
  const year = new Date().getFullYear();
  const categories = await getCategories();

  const infoLinks = infoPages
    .filter((p) => p.group === "info")
    .map((p) => ({ href: `/${p.slug}`, label: p.title }));

  const supportLinks = infoPages
    .filter((p) => p.group === "support")
    .map((p) => ({ href: `/${p.slug}`, label: p.title }));

  const shopLinks = [
    { href: "/shop", label: "সব পণ্য" },
    ...categories.map((c) => ({
      href: `/category/${c.slug}`,
      label: c.nameBn,
    })),
  ];

  const hasContact = site.address || site.phone || site.email;
  const hasSocial = site.facebookUrl || site.instagramUrl || site.whatsapp;

  return (
    <footer className="mt-16 bg-forest text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand and contact */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="সততা লোগো"
                width={64}
                height={64}
                className="rounded-full bg-white"
              />
              <div>
                <p className="text-2xl font-bold">{site.nameBn}</p>
                <p className="text-sm text-white/80">{site.nameEn}</p>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-sm text-white/80">
              {site.tagline}
            </p>

            {hasContact && (
              <ul className="mt-5 space-y-2 text-sm text-white/90">
                {site.address && <li>ঠিকানা: {site.address}</li>}
                {site.phone && (
                  <li>
                    ফোন:{" "}
                    <a href={`tel:${site.phone}`} className="hover:underline">
                      {site.phone}
                    </a>
                  </li>
                )}
                {site.email && (
                  <li>
                    ইমেইল:{" "}
                    <a
                      href={`mailto:${site.email}`}
                      className="hover:underline"
                    >
                      {site.email}
                    </a>
                  </li>
                )}
              </ul>
            )}

            {hasSocial && (
              <div className="mt-5 flex gap-3">
                {site.facebookUrl && (
                  <SocialLink href={site.facebookUrl} label="Facebook">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </SocialLink>
                )}
                {site.instagramUrl && (
                  <SocialLink href={site.instagramUrl} label="Instagram">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </SocialLink>
                )}
                {site.whatsapp && (
                  <SocialLink
                    href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`}
                    label="WhatsApp"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </SocialLink>
                )}
              </div>
            )}
          </div>

          <LinkColumn title="তথ্য" links={infoLinks} />
          <LinkColumn title="দোকান" links={shopLinks} />
          <LinkColumn title="সহায়তা" links={supportLinks} />
        </div>

        {/* Payment methods (text only, shows only what really works) */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/15 pt-6">
          <span className="text-sm font-medium">পেমেন্ট পদ্ধতি:</span>
          {site.paymentMethods.map((m) => (
            <span
              key={m}
              className="rounded-md bg-white/10 px-3 py-1 text-sm"
            >
              {m}
            </span>
          ))}
        </div>

        <p className="mt-6 text-xs text-white/70">
          © {year} {site.nameBn} ({site.nameEn})। সর্বস্বত্ব সংরক্ষিত।
        </p>
      </div>
    </footer>
  );
}
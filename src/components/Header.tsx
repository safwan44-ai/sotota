import Image from "next/image";
import Link from "next/link";
import CartLink from "@/components/CartLink";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-craft/30 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="সততা লোগো"
            width={48}
            height={48}
            priority
          />
          <span className="text-xl font-bold text-forest">সততা</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-forest">
            হোম
          </Link>
          <Link href="/shop" className="hover:text-forest">
            দোকান
          </Link>
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
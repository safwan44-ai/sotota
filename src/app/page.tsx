import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <Image
        src="/logo.png"
        alt="সততা লোগো"
        width={120}
        height={120}
        priority
      />
      <h1 className="text-4xl font-bold text-forest">সততা</h1>
      <p className="text-lg text-charcoal">
        Sotota - বাংলা ফন্ট ও ব্র্যান্ড রঙের পরীক্ষা
      </p>

      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-lg border bg-cream" title="cream" />
        <div className="h-12 w-12 rounded-lg bg-forest" title="forest" />
        <div className="h-12 w-12 rounded-lg bg-craft" title="craft" />
        <div className="h-12 w-12 rounded-lg bg-charcoal" title="charcoal" />
      </div>
    </main>
  );
}
import Link from "next/link";
import { taka } from "@/lib/format";

type Props = {
  slug: string;
  nameBn: string;
  categoryName: string;
  isSample: boolean;
  minPrice: number | null;
  inStock: boolean;
};

export default function ProductCard({
  slug,
  nameBn,
  categoryName,
  isSample,
  minPrice,
  inStock,
}: Props) {
  return (
    <Link
      href={`/product/${slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-craft/30 bg-white transition hover:border-forest/50 hover:shadow-md"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-craft/10 text-sm text-craft">
        ছবি যোগ হবে
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs text-craft">{categoryName}</span>
        <h3 className="font-semibold text-forest">{nameBn}</h3>
        {isSample && (
          <span className="w-fit rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            নমুনা (SAMPLE)
          </span>
        )}
        <p className="mt-auto pt-2 text-sm">
          {minPrice !== null ? (
            <>
              শুরু <strong>{taka(minPrice)}</strong> থেকে
            </>
          ) : (
            "দাম শীঘ্রই জানানো হবে"
          )}
        </p>
        <p className={inStock ? "text-xs text-forest" : "text-xs text-red-700"}>
          {inStock ? "স্টকে আছে" : "স্টক নেই"}
        </p>
      </div>
    </Link>
  );
}
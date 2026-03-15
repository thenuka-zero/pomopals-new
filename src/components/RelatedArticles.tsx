import Link from "next/link";
import { BOOKS } from "@/lib/library-data";

export default function RelatedArticles({ currentSlug }: { currentSlug: string }) {
  const related = BOOKS.filter((b) => b.slug !== currentSlug);

  return (
    <section className="mt-12 pt-8 border-t border-[#F0E6D3]">
      <h2 className="text-lg font-bold text-[#3D2C2C] mb-4">Read next</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {related.map((book) => (
          <Link
            key={book.slug}
            href={`/library/${book.slug}`}
            className="group bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 hover:border-[#E54B4B]/30 hover:shadow-md transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ backgroundColor: book.coverColor }}
            >
              {book.coverPattern}
            </div>
            <p className="text-sm font-bold text-[#3D2C2C] leading-snug group-hover:text-[#E54B4B] transition-colors">
              {book.title}
            </p>
            <p className="text-xs text-[#8B7355] mt-1 leading-relaxed line-clamp-2">
              {book.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

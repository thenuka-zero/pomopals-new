import { notFound } from "next/navigation";
import Link from "next/link";
import { BOOKS } from "@/lib/library-data";
import { headers } from "next/headers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BOOKS.map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const book = BOOKS.find((b) => b.slug === slug);
  if (!book) return { title: "Not Found | Pom's Library" };
  return {
    title: `${book.title} | Pom's Library`,
    description: book.description,
  };
}

export default async function BookPage({ params }: PageProps) {
  const { slug } = await params;
  const book = BOOKS.find((b) => b.slug === slug);

  if (!book) {
    notFound();
  }

  const nonce = (await headers()).get("x-nonce") ?? "";
  const paragraphs = book.content.split("\n\n").filter(Boolean);

  return (
    <main className="min-h-screen">
      <style nonce={nonce} dangerouslySetInnerHTML={{ __html: `
        .book-hero { background-color: ${book.coverColor}; }
        .book-dots { background-image: radial-gradient(${book.coverAccent} 1.5px, transparent 1.5px); background-size: 18px 18px; }
        .book-category-badge { background-color: ${book.categoryColor}; color: #FDF6EC; }
        .book-title { color: ${book.coverTextColor}; }
        .book-author { color: ${book.coverTextColor}; opacity: 0.8; }
        .book-desc { color: ${book.coverTextColor}; opacity: 0.75; }
        .book-divider { background-color: ${book.coverAccent}; }
      ` }} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Back button */}
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[#E54B4B] text-brown-muted"
        >
          <span className="text-base leading-none">&larr;</span>
          Back to Library
        </Link>

        {/* Hero banner */}
        <div
          className="book-hero relative mt-6 rounded-2xl overflow-hidden shadow-lg"
        >
          {/* Radial gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_80%_15%,rgba(255,255,255,0.2)_0%,transparent_55%)]"
          />

          {/* Dot pattern overlay */}
          <div
            className="book-dots absolute inset-0 pointer-events-none opacity-[0.08] z-[1]"
          />

          <div
            className="relative flex flex-col sm:flex-row items-center gap-6 px-8 py-10 sm:py-12 z-[2]"
          >
            {/* Pattern emoji */}
            <div className="flex-shrink-0 flex items-center justify-center w-32 h-32 sm:w-40 sm:h-40">
              <span
                className="book-title leading-none select-none text-[clamp(4rem,8vw,5.5rem)]"
              >
                {book.coverPattern}
              </span>
            </div>

            {/* Text content */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              {/* Category badge */}
              <span
                className="book-category-badge inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
              >
                {book.category}
              </span>

              {/* Title */}
              <h1
                className="book-title text-3xl md:text-5xl font-extrabold leading-tight tracking-tight"
              >
                {book.title}
              </h1>

              {/* Author */}
              <p
                className="book-author mt-3 text-base font-semibold"
              >
                by Pom{" "}
                <span className="not-italic" role="img" aria-label="tomato">
                  🍅
                </span>
              </p>

              {/* Description */}
              <p
                className="book-desc mt-4 text-sm sm:text-base leading-relaxed max-w-prose"
              >
                {book.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content card */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border-2 border-[#F0E6D3] p-8 mt-8 shadow-sm">
          <div className="space-y-0">
            {paragraphs.map((paragraph, index) => (
              <div key={index}>
                <p
                  className="text-lg leading-relaxed text-brown"
                >
                  {paragraph}
                </p>
                {index < paragraphs.length - 1 && (
                  <div className="flex items-center justify-center my-6">
                    <div
                      className="flex-1 h-px bg-sand"
                    />
                    <span className="mx-4 text-lg leading-none select-none opacity-60">
                      🍅
                    </span>
                    <div
                      className="flex-1 h-px bg-sand"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="flex justify-center mt-10 mb-4">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E54B4B] text-white rounded-full font-bold text-sm hover:bg-[#D43D3D] transition-colors shadow-sm"
          >
            <span className="text-base leading-none">📚</span>
            Browse More Books
          </Link>
        </div>
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { BOOKS } from "@/lib/library-data";

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

  const paragraphs = book.content.split("\n\n").filter(Boolean);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FDF6EC" }}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Back button */}
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[#E54B4B]"
          style={{ color: "#8B7355" }}
        >
          <span className="text-base leading-none">&larr;</span>
          Back to Library
        </Link>

        {/* Hero banner */}
        <div
          className="relative mt-6 rounded-2xl overflow-hidden shadow-lg"
          style={{ backgroundColor: book.coverColor }}
        >
          {/* Radial gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 80% 15%, rgba(255,255,255,0.2) 0%, transparent 55%)",
              zIndex: 1,
            }}
          />

          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage: `radial-gradient(${book.coverAccent} 1.5px, transparent 1.5px)`,
              backgroundSize: "18px 18px",
              zIndex: 1,
            }}
          />

          <div
            className="relative flex flex-col sm:flex-row items-center gap-6 px-8 py-10 sm:py-12"
            style={{ zIndex: 2 }}
          >
            {/* Pattern emoji */}
            <div className="flex-shrink-0 flex items-center justify-center w-32 h-32 sm:w-40 sm:h-40">
              <span
                className="leading-none select-none"
                style={{ fontSize: "clamp(4rem, 8vw, 5.5rem)" }}
              >
                {book.coverPattern}
              </span>
            </div>

            {/* Text content */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              {/* Category badge */}
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{
                  backgroundColor: book.categoryColor,
                  color: "#FDF6EC",
                }}
              >
                {book.category}
              </span>

              {/* Title */}
              <h1
                className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight"
                style={{ color: book.coverTextColor }}
              >
                {book.title}
              </h1>

              {/* Author */}
              <p
                className="mt-3 text-base font-semibold"
                style={{
                  color: book.coverTextColor,
                  opacity: 0.8,
                }}
              >
                by Pom{" "}
                <span className="not-italic" role="img" aria-label="tomato">
                  🍅
                </span>
              </p>

              {/* Description */}
              <p
                className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose"
                style={{
                  color: book.coverTextColor,
                  opacity: 0.75,
                }}
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
                  className="text-lg leading-relaxed"
                  style={{ color: "#3D2C2C" }}
                >
                  {paragraph}
                </p>
                {index < paragraphs.length - 1 && (
                  <div className="flex items-center justify-center my-6">
                    <div
                      className="flex-1 h-px"
                      style={{ backgroundColor: "#F0E6D3" }}
                    />
                    <span className="mx-4 text-lg leading-none select-none opacity-60">
                      🍅
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{ backgroundColor: "#F0E6D3" }}
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

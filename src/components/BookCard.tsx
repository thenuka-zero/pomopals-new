import Link from "next/link";
import { Book } from "@/lib/library-data";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/library/${book.slug}`} className="group block">
      <div
        className="relative flex cursor-pointer transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl"
        style={{
          aspectRatio: "2/3",
          borderRadius: "4px 8px 8px 4px",
          boxShadow:
            "0 4px 16px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        {/* Spine */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 rounded-l-sm"
          style={{
            backgroundColor: book.coverColor,
            filter: "brightness(0.7)",
            zIndex: 2,
          }}
        />

        {/* Cover */}
        <div
          className="relative flex flex-col overflow-hidden w-full h-full"
          style={{
            backgroundColor: book.coverColor,
            borderRadius: "2px 8px 8px 2px",
            marginLeft: "8px",
          }}
        >
          {/* Radial gradient overlay for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 75% 20%, rgba(255,255,255,0.18) 0%, transparent 60%)`,
              zIndex: 1,
            }}
          />

          {/* Decorative dot pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `radial-gradient(${book.coverAccent} 1px, transparent 1px)`,
              backgroundSize: "14px 14px",
              zIndex: 1,
            }}
          />

          {/* Pattern area — top 40% */}
          <div
            className="relative flex items-center justify-center"
            style={{ height: "42%", zIndex: 2 }}
          >
            <span
              className="select-none leading-none"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                opacity: 0.85,
              }}
            >
              {book.coverPattern}
            </span>
          </div>

          {/* Divider line */}
          <div
            className="mx-3 flex-shrink-0"
            style={{
              height: "1px",
              backgroundColor: book.coverAccent,
              opacity: 0.35,
              zIndex: 2,
            }}
          />

          {/* Metadata area — bottom 60% */}
          <div
            className="relative flex flex-col items-center justify-between flex-1 px-3 py-3"
            style={{ zIndex: 2 }}
          >
            {/* Title */}
            <p
              className="text-center font-extrabold leading-tight mt-1"
              style={{
                color: book.coverTextColor,
                fontSize: "clamp(0.65rem, 1.2vw, 0.85rem)",
                lineHeight: 1.25,
              }}
            >
              {book.title}
            </p>

            {/* Author */}
            <p
              className="text-center font-semibold mt-1"
              style={{
                color: book.coverTextColor,
                opacity: 0.7,
                fontSize: "clamp(0.55rem, 0.9vw, 0.7rem)",
              }}
            >
              by {book.author}
            </p>

            {/* Category badge */}
            <span
              className="mt-2 px-2 py-0.5 rounded-full font-bold text-center inline-block"
              style={{
                backgroundColor: book.categoryColor,
                color: "#FDF6EC",
                fontSize: "clamp(0.45rem, 0.8vw, 0.6rem)",
                maxWidth: "90%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {book.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

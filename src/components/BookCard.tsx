"use client";

import Link from "next/link";
import { useId } from "react";
import { Book } from "@/lib/library-data";
import { DynamicStyle } from "@/components/DynamicStyle";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const id = `bk-${useId().replace(/:/g, "")}`;
  return (
    <Link href={`/library/${book.slug}`} className="group block">
      <DynamicStyle css={`
        #${id} { aspect-ratio: 2/3; border-radius: 4px 8px 8px 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1); }
        #${id} .spine { background-color: ${book.coverColor}; filter: brightness(0.7); }
        #${id} .cover { background-color: ${book.coverColor}; border-radius: 2px 8px 8px 2px; margin-left: 8px; }
        #${id} .gradient-overlay { background: radial-gradient(ellipse at 75% 20%, rgba(255,255,255,0.18) 0%, transparent 60%); }
        #${id} .dots-overlay { background-image: radial-gradient(${book.coverAccent} 1px, transparent 1px); background-size: 14px 14px; }
        #${id} .divider-line { height: 1px; background-color: ${book.coverAccent}; opacity: 0.35; }
        #${id} .book-title { color: ${book.coverTextColor}; font-size: clamp(0.65rem, 1.2vw, 0.85rem); line-height: 1.25; }
        #${id} .book-author { color: ${book.coverTextColor}; opacity: 0.7; font-size: clamp(0.55rem, 0.9vw, 0.7rem); }
        #${id} .book-emoji { font-size: clamp(2.5rem, 5vw, 3.5rem); opacity: 0.85; }
        #${id} .category-badge { background-color: ${book.categoryColor}; color: #FDF6EC; font-size: clamp(0.45rem, 0.8vw, 0.6rem); }
      `} />
      <div
        id={id}
        className="relative flex cursor-pointer transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl"
      >
        {/* Spine */}
        <div className="spine absolute left-0 top-0 bottom-0 w-2 rounded-l-sm z-[2]" />

        {/* Cover */}
        <div className="cover relative flex flex-col overflow-hidden w-full h-full">
          {/* Radial gradient overlay for depth */}
          <div className="gradient-overlay absolute inset-0 pointer-events-none z-[1]" />

          {/* Decorative dot pattern overlay */}
          <div className="dots-overlay absolute inset-0 pointer-events-none opacity-10 z-[1]" />

          {/* Pattern area — top 42% */}
          <div className="relative flex items-center justify-center z-[2] h-[42%]">
            <span className="book-emoji select-none leading-none">
              {book.coverPattern}
            </span>
          </div>

          {/* Divider line */}
          <div className="divider-line mx-3 flex-shrink-0 z-[2]" />

          {/* Metadata area — bottom 60% */}
          <div className="relative flex flex-col items-center justify-between flex-1 px-3 py-3 z-[2]">
            {/* Title */}
            <p className="book-title text-center font-extrabold leading-tight mt-1">
              {book.title}
            </p>

            {/* Author */}
            <p className="book-author text-center font-semibold mt-1">
              by {book.author}
            </p>

            {/* Category badge */}
            <span className="category-badge mt-2 px-2 py-0.5 rounded-full font-bold text-center inline-block max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap">
              {book.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

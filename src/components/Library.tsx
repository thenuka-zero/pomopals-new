"use client";

import { useState } from "react";
import { BOOKS } from "@/lib/library-data";
import BookCard from "./BookCard";

const CATEGORIES = ["All"];

export default function Library() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredBooks =
    activeCategory === "All"
      ? BOOKS
      : BOOKS.filter((book) => book.category === activeCategory);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3 leading-none select-none">📚</div>
        <h1
          className="text-4xl font-extrabold tracking-tight text-brown"
        >
          Pom&apos;s Library
        </h1>
        <p
          className="mt-3 text-lg font-semibold text-brown-muted"
        >
          &ldquo;A cozy corner of the internet &mdash; curl up and read something
          good.&rdquo;
        </p>
      </div>

      {/* Category filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 ${
                isActive
                  ? "bg-[#E54B4B] text-white shadow-sm"
                  : "bg-white border-2 border-[#F0E6D3] text-[#8B7355] hover:border-[#E54B4B] hover:text-[#E54B4B]"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Book grid */}
      {filteredBooks.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-lg font-bold text-brown-light">
            No books found in this category yet.
          </p>
          <p className="text-sm text-brown-muted">
            Pom is busy writing more — check back soon!
          </p>
          <button
            onClick={() => setActiveCategory("All")}
            className="mt-2 px-5 py-2 bg-[#E54B4B] text-white rounded-full text-sm font-bold hover:bg-[#D43D3D] transition-colors"
          >
            Browse all books
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-8">
          {filteredBooks.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

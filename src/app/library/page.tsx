import Library from "@/components/Library";

export const metadata = {
  title: "Pom's Library | PomoPals",
  description:
    "A cozy collection of reads about focus, productivity, and mindful work.",
};

export default function LibraryPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Library />
      </div>
    </main>
  );
}

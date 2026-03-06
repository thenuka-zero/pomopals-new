export default function AdminLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="h-7 w-44 bg-[#F0E6D3] rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-[#F0E6D3] rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-[#F0E6D3] rounded-full animate-pulse flex-shrink-0" />
      </div>

      {/* Section A skeleton */}
      <div className="space-y-5 mb-10">
        <div className="h-5 w-36 bg-[#F0E6D3] rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#F0E6D3] animate-pulse mb-2" />
              <div className="h-7 w-16 bg-[#F0E6D3] rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-[#F0E6D3] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-[220px] bg-white border-2 border-[#F0E6D3] rounded-2xl animate-pulse" />
      </div>

      <div className="border-t border-[#F0E6D3] mb-10" />

      {/* Section B skeleton */}
      <div className="space-y-5 mb-10">
        <div className="h-5 w-28 bg-[#F0E6D3] rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#F0E6D3] animate-pulse mb-2" />
              <div className="h-7 w-16 bg-[#F0E6D3] rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-[#F0E6D3] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-[220px] bg-white border-2 border-[#F0E6D3] rounded-2xl animate-pulse" />
      </div>

      <div className="border-t border-[#F0E6D3] mb-10" />

      {/* Section C skeleton */}
      <div className="space-y-5">
        <div className="h-5 w-20 bg-[#F0E6D3] rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-[#F0E6D3] animate-pulse mb-2" />
              <div className="h-7 w-16 bg-[#F0E6D3] rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-[#F0E6D3] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

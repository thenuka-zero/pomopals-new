"use client";

interface AdminStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  loading?: boolean;
}

export default function AdminStatCard({
  icon,
  label,
  value,
  subtitle,
  accentColor = "#E54B4B",
  loading = false,
}: AdminStatCardProps) {
  if (loading) {
    return (
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-[#F0E6D3] animate-pulse mb-2" />
        <div className="h-7 w-16 bg-[#F0E6D3] rounded animate-pulse mb-1" />
        <div className="h-3 w-20 bg-[#F0E6D3] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-[#3D2C2C] leading-tight">
        {value}
      </div>
      <div className="text-xs text-[#8B7355] mt-0.5 font-semibold">{label}</div>
      {subtitle && (
        <div className="text-[10px] text-[#A08060] mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

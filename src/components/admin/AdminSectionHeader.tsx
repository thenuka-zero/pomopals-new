"use client";

interface AdminSectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminSectionHeader({ title, subtitle }: AdminSectionHeaderProps) {
  return (
    <div className="mb-4 pb-3 border-b border-[#F0E6D3]">
      <h2 className="text-base font-bold text-[#3D2C2C]">{title}</h2>
      {subtitle && (
        <p className="text-xs text-[#A08060] mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

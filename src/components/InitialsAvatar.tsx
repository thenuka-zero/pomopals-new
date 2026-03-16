interface InitialsAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function InitialsAvatar({ name, size = 40, className = "" }: InitialsAvatarProps) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={`rounded-full bg-[#E54B4B] flex items-center justify-center text-white font-bold select-none flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </div>
  );
}

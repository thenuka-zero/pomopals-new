"use client";

export default function TomatoMascot({ className = "", size = 200 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body - round tomato shape */}
      <ellipse cx="100" cy="115" rx="72" ry="68" fill="#E54B4B" />
      {/* Body highlight/shine */}
      <ellipse cx="80" cy="95" rx="30" ry="22" fill="#F06060" opacity="0.5" />
      <ellipse cx="75" cy="88" rx="12" ry="8" fill="#F28080" opacity="0.4" />

      {/* Stem */}
      <rect x="95" y="42" width="10" height="18" rx="5" fill="#5B8C3E" />

      {/* Leaves */}
      <ellipse cx="82" cy="52" rx="18" ry="8" fill="#6EAE3E" transform="rotate(-25 82 52)" />
      <ellipse cx="118" cy="52" rx="18" ry="8" fill="#6EAE3E" transform="rotate(25 118 52)" />
      <ellipse cx="72" cy="56" rx="14" ry="6" fill="#5B9E35" transform="rotate(-40 72 56)" />
      <ellipse cx="128" cy="56" rx="14" ry="6" fill="#5B9E35" transform="rotate(40 128 56)" />

      {/* Face - Eyes */}
      <ellipse cx="80" cy="112" rx="8" ry="9" fill="#3D2417" />
      <ellipse cx="120" cy="112" rx="8" ry="9" fill="#3D2417" />
      {/* Eye highlights */}
      <circle cx="83" cy="108" r="3.5" fill="white" />
      <circle cx="123" cy="108" r="3.5" fill="white" />
      <circle cx="78" cy="114" r="1.5" fill="white" />
      <circle cx="118" cy="114" r="1.5" fill="white" />

      {/* Cute smile */}
      <path
        d="M88 126 Q100 138 112 126"
        stroke="#3D2417"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Blush cheeks */}
      <ellipse cx="66" cy="124" rx="10" ry="7" fill="#F5A0A0" opacity="0.6" />
      <ellipse cx="134" cy="124" rx="10" ry="7" fill="#F5A0A0" opacity="0.6" />

      {/* Little hands/arms */}
      {/* Left arm */}
      <path
        d="M32 120 Q25 115 28 108"
        stroke="#E54B4B"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="27" cy="106" r="5" fill="#E54B4B" />
      {/* Right arm */}
      <path
        d="M168 120 Q175 115 172 108"
        stroke="#E54B4B"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="173" cy="106" r="5" fill="#E54B4B" />

      {/* Little feet */}
      <ellipse cx="80" cy="180" rx="14" ry="6" fill="#D43D3D" />
      <ellipse cx="120" cy="180" rx="14" ry="6" fill="#D43D3D" />
    </svg>
  );
}

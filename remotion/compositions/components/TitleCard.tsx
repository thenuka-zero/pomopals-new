interface Props {
  emoji: string
  title: string
  sessions: number
  compact?: boolean
  opacity?: number
  translateY?: number
}

export function TitleCard({ emoji, title, sessions, compact = false, opacity = 1, translateY = 0 }: Props) {
  if (compact) {
    return (
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          background: "rgba(0,0,0,0.45)",
          borderRadius: 16,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          opacity,
          transform: `translateY(${translateY}px)`,
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ fontSize: 28 }}>{emoji}</span>
        <div>
          <div style={{ color: "white", fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{title}</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600 }}>
            {sessions} sessions · {sessions * 25} min
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ fontSize: 100, marginBottom: 24, lineHeight: 1 }}>{emoji}</div>
      <h1
        style={{
          color: "white",
          fontWeight: 900,
          fontSize: 72,
          textAlign: "center",
          margin: "0 0 16px",
          textShadow: "0 4px 24px rgba(0,0,0,0.3)",
          fontFamily: "sans-serif",
        }}
      >
        {title}
      </h1>
      <div
        style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: 32,
          fontWeight: 600,
          fontFamily: "sans-serif",
          marginBottom: 20,
        }}
      >
        {sessions} sessions · {sessions * 25} min
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 3,
          fontFamily: "sans-serif",
          textTransform: "uppercase",
        }}
      >
        PomoPals
      </div>
    </div>
  )
}

interface Props {
  badge: "hot" | "moving" | "calm";
  score: number;
}
const LABELS = { hot: "🔥 Hot", moving: "⚡ Moving", calm: "🟢 Calm" };

export default function DriftBadge({ badge, score }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <div className={`drift-badge ${badge}`}>{LABELS[badge]}</div>
      <div className="drift-score-bar">
        <div className={`drift-score-fill ${badge}`} style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
    </div>
  );
}

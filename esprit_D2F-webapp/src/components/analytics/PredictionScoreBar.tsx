import { Progress, Tooltip } from "antd";

interface PredictionScoreBarProps {
  value:   number;   // 0–1
  label?:  string;
  size?:   "small" | "default";
  showPct?: boolean;
}

function scoreToColor(v: number): string {
  if (v >= 0.75) return "#ef4444";
  if (v >= 0.50) return "#f97316";
  if (v >= 0.25) return "#f59e0b";
  return "#10b981";
}

export default function PredictionScoreBar({
  value, label, size = "default", showPct = true,
}: PredictionScoreBarProps) {
  const pct   = Math.round(value * 100);
  const color = scoreToColor(value);
  const tip   = label ? `${label} : ${pct}%` : `${pct}%`;

  return (
    <Tooltip title={tip}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Progress
          percent={pct}
          strokeColor={color}
          trailColor="#e5e7eb"
          size={size === "small" ? "small" : "default"}
          showInfo={showPct}
          style={{ flex: 1, marginBottom: 0 }}
        />
      </div>
    </Tooltip>
  );
}

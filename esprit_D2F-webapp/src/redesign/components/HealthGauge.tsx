export default function HealthGauge({ score, color = "#10b981" }: { readonly score: number; readonly color?: string }) {
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const rotate = -90;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <title>Score de santé {score}</title>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rd-surface-3)" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(${rotate} ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--rd-text)" style={{ fontFamily: "Inter, sans-serif" }}>
        {score}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="12" fill="var(--rd-text-3)" style={{ fontFamily: "Inter, sans-serif" }}>
        / 100
      </text>
    </svg>
  );
}

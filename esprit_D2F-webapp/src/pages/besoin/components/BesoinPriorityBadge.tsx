const PRIORITY_LABELS: Record<string, string> = {
  CRITIQUE: "Critique",
  HAUTE:    "Haute",
  MOYENNE:  "Moyenne",
  BASSE:    "Basse",
};

type PriorityValue = keyof typeof PRIORITY_LABELS;

interface BesoinPriorityBadgeProps {
  value?: PriorityValue;
  size?: "sm" | "md";
}

export default function BesoinPriorityBadge({ value, size = "md" }: Readonly<BesoinPriorityBadgeProps>) {
  if (!value) return null;
  const label = PRIORITY_LABELS[value] || value;
  return (
    <span className={`bf-priority bf-priority--${value} bf-priority--${size}`}>
      <span className="bf-priority__dot" aria-hidden="true" />
      {label}
    </span>
  );
}







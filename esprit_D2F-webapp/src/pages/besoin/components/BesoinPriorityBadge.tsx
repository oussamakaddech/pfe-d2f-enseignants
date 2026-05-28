import PropTypes from "prop-types";

const PRIORITY_LABELS = {
  CRITIQUE: "Critique",
  HAUTE:    "Haute",
  MOYENNE:  "Moyenne",
  BASSE:    "Basse",
};

/**
 * Pill de priorité.
 * Le style est porté par la classe `bf-priority--{level}` définie dans la CSS.
 */
export default function BesoinPriorityBadge({ value, size = "md" }: any) {
  if (!value) return null;
  const label = (PRIORITY_LABELS as any)[value] || value;
  return (
    <span className={`bf-priority bf-priority--${value} bf-priority--${size}`}>
      <span className="bf-priority__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

BesoinPriorityBadge.propTypes = {
  value: PropTypes.oneOf(["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"]),
  size: PropTypes.oneOf(["sm", "md"]),
};





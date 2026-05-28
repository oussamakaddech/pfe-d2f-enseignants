interface BesoinStatusBadgeProps {
  approved: boolean;
}

export default function BesoinStatusBadge({ approved }: BesoinStatusBadgeProps) {
  const tone = approved ? "approved" : "pending";
  const label = approved ? "Approuvé" : "En attente";
  return (
    <span className={`bf-status bf-status--${tone}`}>
      <span className="bf-status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}







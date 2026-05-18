import PropTypes from "prop-types";

/**
 * Pill statut. Le dot pulse en jaune si "en attente" (action requise).
 */
export default function BesoinStatusBadge({ approved }) {
  const tone = approved ? "approved" : "pending";
  const label = approved ? "Approuvé" : "En attente";
  return (
    <span className={`bf-status bf-status--${tone}`}>
      <span className="bf-status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

BesoinStatusBadge.propTypes = {
  approved: PropTypes.bool.isRequired,
};

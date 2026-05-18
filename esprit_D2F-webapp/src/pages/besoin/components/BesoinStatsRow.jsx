import PropTypes from "prop-types";
import {
  InboxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

/**
 * Mini-card statistique réutilisable.
 * Variant détermine la couleur d'accent (rail + icône) sans changer la structure.
 */
function StatCard({ icon, label, value, hint, variant }) {
  return (
    <article className={`bf-stat bf-stat--${variant}`}>
      <div className="bf-stat__rail" aria-hidden="true" />
      <div className="bf-stat__icon">{icon}</div>
      <div className="bf-stat__body">
        <div className="bf-stat__label">{label}</div>
        <div className="bf-stat__value">{value}</div>
        {hint && <div className="bf-stat__hint">{hint}</div>}
      </div>
    </article>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hint: PropTypes.string,
  variant: PropTypes.oneOf(["info", "success", "warning"]).isRequired,
};

/**
 * Rangée de 3 KPI cards alignées sur la même grille.
 * Hint = texte contextuel court ("Total cumulé", "Dossiers traités", etc.).
 */
export default function BesoinStatsRow({ total, approved, pending }) {
  const tauxApprobation = total === 0 ? 0 : Math.round((approved * 100) / total);
  return (
    <section className="bf-stats" aria-label="Indicateurs clés">
      <StatCard
        variant="info"
        icon={<InboxOutlined />}
        label="Total des besoins"
        value={total}
        hint="Tous statuts confondus"
      />
      <StatCard
        variant="success"
        icon={<CheckCircleOutlined />}
        label="Besoins approuvés"
        value={approved}
        hint={`${tauxApprobation}% du total`}
      />
      <StatCard
        variant="warning"
        icon={<ClockCircleOutlined />}
        label="En attente d'instruction"
        value={pending}
        hint={pending > 0 ? "Action requise" : "À jour"}
      />
    </section>
  );
}

BesoinStatsRow.propTypes = {
  total: PropTypes.number.isRequired,
  approved: PropTypes.number.isRequired,
  pending: PropTypes.number.isRequired,
};

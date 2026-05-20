import PropTypes from "prop-types";
import {
  InboxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

/**
 * Mini-card statistique réutilisable.
 * Variant détermine la couleur d'accent (rail + icône) sans changer la structure.
 */
function StatCard({ icon, label, value, hint, variant, progress, trend }) {
  return (
    <article className={`bf-stat bf-stat--${variant}`}>
      <div className="bf-stat__rail" aria-hidden="true" />
      <div className="bf-stat__icon">{icon}</div>
      <div className="bf-stat__body">
        <div className="bf-stat__label">{label}</div>
        <div className="bf-stat__value">
          {value}
          {trend && (
            <span className={`bf-stat__trend bf-stat__trend--${trend.tone}`}>
              {trend.icon}
              {trend.label}
            </span>
          )}
        </div>
        {hint && <div className="bf-stat__hint">{hint}</div>}
        {typeof progress === "number" && (
          <div
            className="bf-stat__progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bf-stat__progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
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
  progress: PropTypes.number,
  trend: PropTypes.shape({
    tone: PropTypes.oneOf(["up", "flat", "warn"]).isRequired,
    icon: PropTypes.node,
    label: PropTypes.string.isRequired,
  }),
};

/**
 * Rangée de 3 KPI cards alignées sur la même grille.
 * Hint = texte contextuel court ("Total cumulé", "Dossiers traités", etc.).
 */
export default function BesoinStatsRow({ total, approved, pending }) {
  const tauxApprobation = total === 0 ? 0 : Math.round((approved * 100) / total);
  const tauxAttente     = total === 0 ? 0 : Math.round((pending  * 100) / total);
  return (
    <section className="bf-stats" aria-label="Indicateurs clés">
      <StatCard
        variant="info"
        icon={<InboxOutlined />}
        label="Total des besoins"
        value={total}
        hint="Tous statuts confondus"
        progress={total === 0 ? 0 : 100}
        trend={
          total > 0
            ? { tone: "up", icon: <ArrowUpOutlined />, label: "Actif" }
            : { tone: "flat", icon: <MinusOutlined />, label: "Aucun" }
        }
      />
      <StatCard
        variant="success"
        icon={<CheckCircleOutlined />}
        label="Besoins approuvés"
        value={approved}
        hint={`${tauxApprobation}% du total`}
        progress={tauxApprobation}
        trend={
          tauxApprobation >= 75
            ? { tone: "up", icon: <ArrowUpOutlined />, label: "Bonne dynamique" }
            : { tone: "flat", icon: <MinusOutlined />, label: "En cours" }
        }
      />
      <StatCard
        variant="warning"
        icon={<ClockCircleOutlined />}
        label="En attente d'instruction"
        value={pending}
        hint={pending > 0 ? "Action requise" : "À jour"}
        progress={tauxAttente}
        trend={
          pending > 0
            ? { tone: "warn", icon: <ExclamationCircleOutlined />, label: "À traiter" }
            : { tone: "up", icon: <ArrowUpOutlined />, label: "À jour" }
        }
      />
    </section>
  );
}

BesoinStatsRow.propTypes = {
  total: PropTypes.number.isRequired,
  approved: PropTypes.number.isRequired,
  pending: PropTypes.number.isRequired,
};





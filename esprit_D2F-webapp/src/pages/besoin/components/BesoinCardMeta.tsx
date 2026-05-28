import PropTypes from "prop-types";

/**
 * Ligne de chips secondaires sous la card besoin.
 * Affiche uniquement les meta non vides → évite les chips "—".
 */
export default function BesoinCardMeta({ items }: any) {
  const visible = items.filter((i: any) => i?.value);
  if (visible.length === 0) return null;
  return (
    <div className="bf-card__meta">
      {visible.map((it: any) => (
        <span key={it.key} className="bf-card__meta-chip" title={`${it.label} : ${it.value}`}>
          {it.icon && <span className="bf-card__meta-icon">{it.icon}</span>}
          <span className="bf-card__meta-text">{it.value}</span>
        </span>
      ))}
    </div>
  );
}

BesoinCardMeta.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.string,
      icon: PropTypes.node,
    })
  ).isRequired,
};





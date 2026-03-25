/* eslint-disable react/prop-types */

export default function ActiveFiltersBar({ filters, onRemove, onClearAll }) {
  if (!Array.isArray(filters) || filters.length === 0) return null;

  return (
    <div className="ctp-active-filters">
      <span className="ctp-active-filters__label">Filtres :</span>

      {filters.map((chip) => (
        <span key={chip.key} className={`ctp-badge ctp-badge--${chip.color} ctp-filter-chip`}>
          {chip.label}
          <button
            className="ctp-filter-chip__remove"
            onClick={() => onRemove(chip.key)}
            aria-label={`Retirer le filtre ${chip.label}`}
          >
            x
          </button>
        </span>
      ))}

      {filters.length > 1 && (
        <button className="ctp-active-filters__clear" onClick={onClearAll}>
          Tout effacer
        </button>
      )}
    </div>
  );
}

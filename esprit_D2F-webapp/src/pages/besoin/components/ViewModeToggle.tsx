import PropTypes from "prop-types";
import { Segmented } from "antd";
import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";

/**
 * Toggle Cards / Tableau aligné avec compteur de résultats.
 * Le résultat est mis en valeur typographiquement (chiffre gros, label discret).
 */
export default function ViewModeToggle({ value, onChange, count, total }) {
  return (
    <div className="bf-viewmode">
      <div className="bf-viewmode__count" aria-live="polite">
        <span className="bf-viewmode__count-value">{count}</span>
        <span className="bf-viewmode__count-label">
          besoin{count !== 1 ? "s" : ""} affiché{count !== 1 ? "s" : ""}
          {count !== total && total > 0 && (
            <span className="bf-viewmode__count-total"> sur {total}</span>
          )}
        </span>
      </div>
      <Segmented
        value={value}
        onChange={onChange}
        className="bf-viewmode__toggle"
        options={[
          { value: "cards",  label: "Cards",   icon: <AppstoreOutlined /> },
          { value: "table",  label: "Tableau", icon: <UnorderedListOutlined /> },
        ]}
      />
    </div>
  );
}

ViewModeToggle.propTypes = {
  value: PropTypes.oneOf(["cards", "table"]).isRequired,
  onChange: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};





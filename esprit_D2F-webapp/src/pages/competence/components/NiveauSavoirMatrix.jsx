// src/pages/competence/components/NiveauSavoirMatrix.jsx
import PropTypes from "prop-types";
import { Empty, Tooltip } from "antd";

export default function NiveauSavoirMatrix({ data, title, code }) {
  const NIVEAUX = [
    { key: "N1_DEBUTANT", label: "N 1" },
    { key: "N2_ELEMENTAIRE", label: "N 2" },
    { key: "N3_INTERMEDIAIRE", label: "N 3" },
    { key: "N4_AVANCE", label: "N 4" },
    { key: "N5_EXPERT", label: "N 5" },
  ];

  const maxRows = Math.max(...NIVEAUX.map((n) => (data[n.key] || []).length), 1);
  const totalSavoirs = NIVEAUX.reduce((sum, n) => sum + (data[n.key]?.length ?? 0), 0);
  if (totalSavoirs === 0) {
    return <Empty description="Aucun savoir requis défini pour cette compétence" />;
  }

  const tdStyle = {
    border: "1px solid #000",
    padding: "6px 12px",
    textAlign: "center",
    fontSize: 13,
    minWidth: 80,
  };

  const thStyle = {
    ...tdStyle,
    fontWeight: "bold",
    background: "#fff",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          tableLayout: "fixed",
          fontFamily: "inherit",
        }}
      >
        <thead>
          <tr>
            <th
              colSpan={NIVEAUX.length}
              style={{
                ...tdStyle,
                background: "#fff",
                color: "#007b7b",
                fontStyle: "italic",
                fontSize: 14,
                fontWeight: "bold",
                textAlign: "center",
                padding: "8px 12px",
              }}
            >
              {title && <span>{title}</span>}
              {title && code && <br />}
              {code && <span>{code}</span>}
            </th>
          </tr>
          <tr>
            {NIVEAUX.map((n) => (
              <th key={n.key} style={thStyle}>{n.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }, (_, i) => (
            <tr key={i}>
              {NIVEAUX.map((n) => {
                const item = (data[n.key] || [])[i];
                return (
                  <td key={n.key} style={tdStyle}>
                    {item ? (
                      <Tooltip title={item.savoirNom}>
                        <span style={{ cursor: "default" }}>{item.savoirCode}</span>
                      </Tooltip>
                    ) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

NiveauSavoirMatrix.propTypes = {
  data: PropTypes.object.isRequired,
  title: PropTypes.string,
  code: PropTypes.string,
};

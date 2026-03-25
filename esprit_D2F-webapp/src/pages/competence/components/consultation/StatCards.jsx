/* eslint-disable react/prop-types */
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { ACCENT } from "./utils";

const STAT_DEFS = [
  { key: "domaines", label: "Domaines", statKey: "totalDomaines", icon: <FolderOpenOutlined />, accent: ACCENT.domaine },
  { key: "competences", label: "Competences", statKey: "totalCompetences", icon: <ApartmentOutlined />, accent: ACCENT.competence },
  { key: "sousCompetences", label: "Sous-comp.", statKey: "totalSousCompetences", icon: <BulbOutlined />, accent: ACCENT.sousComp },
  { key: "savoirs", label: "Savoirs", statKey: "totalSavoirs", icon: <BookOutlined />, accent: ACCENT.savoir },
  { key: "theoriques", label: "Theoriques", statKey: "totalSavoirsTheoriques", icon: <BookOutlined />, accent: ACCENT.theorique },
  { key: "pratiques", label: "Pratiques", statKey: "totalSavoirsPratiques", icon: <ExperimentOutlined />, accent: ACCENT.pratique },
];

export default function StatCards({ stats, onStatClick }) {
  return (
    <div className="ctp-stat-grid ctp-section">
      {STAT_DEFS.map((def) => (
        <button
          key={def.key}
          className="ctp-stat-card"
          style={{ "--ctp-stat-accent": def.accent.color }}
          onClick={() => onStatClick(def.key)}
        >
          <div className="ctp-stat-card__head">
            <div className="ctp-stat-card__icon" style={{ background: def.accent.bg, color: def.accent.color }}>
              {def.icon}
            </div>
          </div>
          <div className="ctp-stat-card__value">{stats?.[def.statKey] ?? 0}</div>
          <div className="ctp-stat-card__label">{def.label}</div>
        </button>
      ))}
    </div>
  );
}

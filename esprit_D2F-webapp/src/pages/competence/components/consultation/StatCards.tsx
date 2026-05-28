import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { ACCENT } from "@/utils/helpers/consultationViewUtils";

const STAT_DEFS = [
  { key: "domaines", label: "Domaines", statKey: "totalDomaines", icon: <FolderOpenOutlined />, accent: ACCENT.domaine },
  { key: "competences", label: "Competences", statKey: "totalCompetences", icon: <ApartmentOutlined />, accent: ACCENT.competence },
  { key: "sousCompetences", label: "Sous-comp.", statKey: "totalSousCompetences", icon: <BulbOutlined />, accent: ACCENT.sousComp },
  { key: "savoirs", label: "Savoirs", statKey: "totalSavoirs", icon: <BookOutlined />, accent: ACCENT.savoir },
  { key: "theoriques", label: "Theoriques", statKey: "totalSavoirsTheoriques", icon: <BookOutlined />, accent: ACCENT.theorique },
  { key: "pratiques", label: "Pratiques", statKey: "totalSavoirsPratiques", icon: <ExperimentOutlined />, accent: ACCENT.pratique },
];

interface Stats {
  totalDomaines?: number;
  totalCompetences?: number;
  totalSousCompetences?: number;
  totalSavoirs?: number;
  totalSavoirsTheoriques?: number;
  totalSavoirsPratiques?: number;
}

interface StatCardsProps {
  stats?: Stats;
  onStatClick: (key: string) => void;
}

export default function StatCards({ stats, onStatClick }: Readonly<StatCardsProps>) {
  return (
    <div className="ctp-stat-grid ctp-section">
      {STAT_DEFS.map((def) => (
        <button
          key={def.key}
          className="ctp-stat-card"
          style={{ "--ctp-stat-accent": def.accent.color } as React.CSSProperties}
          onClick={() => onStatClick(def.key)}
        >
          <div className="ctp-stat-card__head">
            <div className="ctp-stat-card__icon" style={{ background: def.accent.bg, color: def.accent.color }}>
              {def.icon}
            </div>
          </div>
          <div className="ctp-stat-card__value">{stats?.[def.statKey as keyof Stats] ?? 0}</div>
          <div className="ctp-stat-card__label">{def.label}</div>
        </button>
      ))}
    </div>
  );
}







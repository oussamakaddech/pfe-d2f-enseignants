import { Button, Space, Typography } from "antd";
import {
  FileTextOutlined,
  LoadingOutlined,
  MergeCellsOutlined,
  ReloadOutlined,
  RobotOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { EnseignantRef } from "./riceTypes";

interface LiveStats {
  totalSavoirs: number;
  totalDomaines: number;
  totalComp: number;
  enseignantsAssigned: number;
}

interface RiceHeroSectionProps {
  currentDeptLabel: string;
  filesCount: number;
  currentStep: number;
  stepsCount: number;
  currentStageTitle: string;
  liveStats: LiveStats;
  allEnseignants: EnseignantRef[];
  ignoreEnseignants: boolean;
  effectiveEnseignants: EnseignantRef[];
  analyzing: boolean;
  onAnalyze: () => void;
  onNavigateMatchmaking: () => void;
  onReset: () => void;
}

const { Text, Title } = Typography;

const METRIC_ICONS = [
  <FileTextOutlined key="files"  style={{ fontSize: 20 }} />,
  <TeamOutlined    key="ens"    style={{ fontSize: 20 }} />,
  <ThunderboltOutlined key="sav" style={{ fontSize: 20 }} />,
  <RobotOutlined   key="aff"   style={{ fontSize: 20 }} />,
];

export default function RiceHeroSection({
  currentDeptLabel, filesCount, currentStep, stepsCount, currentStageTitle,
  liveStats, allEnseignants, ignoreEnseignants, effectiveEnseignants,
  analyzing, onAnalyze, onNavigateMatchmaking, onReset,
}: Readonly<RiceHeroSectionProps>) {

  const metrics = [
    {
      label: "Fichiers",
      value: filesCount,
      note: filesCount > 0 ? `${filesCount} prêt${filesCount > 1 ? "s" : ""}` : "Aucun chargé",
    },
    {
      label: "Enseignants",
      value: ignoreEnseignants ? 0 : allEnseignants.length,
      note: ignoreEnseignants ? "Mode manuel" : "Synchronisé",
    },
    {
      label: "Savoirs",
      value: liveStats.totalSavoirs,
      note: `${liveStats.totalDomaines} dom. · ${liveStats.totalComp} comp.`,
    },
    {
      label: "Affectations",
      value: liveStats.enseignantsAssigned,
      note: `${effectiveEnseignants.length} enseignants visibles`,
    },
  ];

  return (
    <section className="rice-hero">
      {/* ── Top row: brand + actions ─────────────────────── */}
      <div className="rice-hero-content">
        <div className="rice-hero-copy">
          <div className="rice-hero-kicker">
            <ThunderboltOutlined />
            <span>RICE Workbench</span>
          </div>
          <Title level={4} className="rice-hero-title">
            Référentiel intelligent des compétences enseignants
          </Title>
          <div className="rice-hero-chips">
            <span className="rice-chip rice-chip-accent">{currentDeptLabel}</span>
            <span className="rice-chip">Étape {currentStep + 1}&thinsp;/&thinsp;{stepsCount}</span>
            <span className="rice-chip">{currentStageTitle}</span>
          </div>
        </div>

        <div className="rice-hero-actions">
          <Space wrap>
            <Button
              icon={<MergeCellsOutlined />}
              onClick={onNavigateMatchmaking}
            >
              Matchmaking
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onReset}>
              Réinitialiser
            </Button>
            <Button
              type="primary"
              className="rice-primary-action"
              icon={analyzing ? <LoadingOutlined /> : <RobotOutlined />}
              onClick={onAnalyze}
              disabled={filesCount === 0 || analyzing}
            >
              {analyzing ? "Analyse en cours…" : "Lancer l'analyse"}
            </Button>
          </Space>
        </div>
      </div>

      {/* ── Metrics row ──────────────────────────────────── */}
      <div className="rice-hero-metrics">
        {metrics.map((m, idx) => (
          <div key={m.label} className="rice-metric-card ant-card ant-card-bordered">
            <div className="ant-card-body">
              <div className="rice-metric-icon">{METRIC_ICONS[idx]}</div>
              <div className="rice-metric-body">
                <div className="rice-metric-value">{m.value}</div>
                <Text className="rice-metric-label">{m.label}</Text>
                <Text className="rice-metric-note">{m.note}</Text>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Button, Card, Space, Typography } from "antd";
import { LoadingOutlined, MergeCellsOutlined, RobotOutlined, ThunderboltOutlined } from "@ant-design/icons";
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

const { Text, Title, Paragraph } = Typography;

export default function RiceHeroSection({
  currentDeptLabel, filesCount, currentStep, stepsCount, currentStageTitle,
  liveStats, allEnseignants, ignoreEnseignants, effectiveEnseignants,
  analyzing, onAnalyze, onNavigateMatchmaking, onReset,
}: Readonly<RiceHeroSectionProps>) {
  const highlights = [
    { label: "Fichiers prêts", value: filesCount, note: "Documents à analyser" },
    {
      label: "Enseignants chargés",
      value: ignoreEnseignants ? 0 : allEnseignants.length,
      note: ignoreEnseignants ? "Mode manuel actif" : "Synchronisé avec le backend",
    },
    {
      label: "Savoirs extraits",
      value: liveStats.totalSavoirs,
      note: `${liveStats.totalDomaines} domaines · ${liveStats.totalComp} compétences`,
    },
    {
      label: "Affectations actives",
      value: liveStats.enseignantsAssigned,
      note: `${effectiveEnseignants.length} enseignants visibles`,
    },
  ];

  return (
    <section className="rice-hero">
      <div className="rice-hero-content">
        <div className="rice-hero-copy">
          <div className="rice-hero-kicker">
            <ThunderboltOutlined /><span>RICE Workbench</span>
          </div>
          <Title level={2} className="rice-hero-title">
            Référentiel intelligent des compétences enseignants
          </Title>
          <Paragraph className="rice-hero-subtitle">
            Importez vos fiches, laissez l&apos;analyse IA extraire l&apos;arbre de compétences,
            corrigez la structure par glisser-déposer, puis synchronisez les résultats vers la base.
          </Paragraph>
          <div className="rice-hero-chips">
            <span className="rice-chip">{currentDeptLabel}</span>
            <span className="rice-chip">Étape {currentStep + 1} / {stepsCount}</span>
            <span className="rice-chip">Backend prêt</span>
            <span className="rice-chip rice-chip-accent">{currentStageTitle}</span>
          </div>
          <Space wrap className="rice-hero-actions">
            <Button
              type="primary" size="large"
              icon={analyzing ? <LoadingOutlined /> : <RobotOutlined />}
              onClick={onAnalyze}
              disabled={filesCount === 0 || analyzing}
              className="rice-primary-action"
            >
              {analyzing ? "Analyse en cours" : "Lancer l'analyse"}
            </Button>
            <Button size="large" icon={<MergeCellsOutlined />} onClick={onNavigateMatchmaking}>
              Ouvrir le matchmaking
            </Button>
            <Button size="large" onClick={onReset}>Réinitialiser</Button>
          </Space>
        </div>

        <div className="rice-hero-metrics">
          {highlights.map((item) => (
            <Card key={item.label} className="rice-metric-card" bordered={false}>
              <Text className="rice-metric-label">{item.label}</Text>
              <div className="rice-metric-value">{item.value}</div>
              <Text className="rice-metric-note" type="secondary">{item.note}</Text>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Button, Space, Typography } from 'antd';
import {
  FileTextOutlined,
  MergeCellsOutlined,
  ReloadOutlined,
  RobotOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { EnseignantRef } from './riceTypes';

interface LiveStats {
  totalSavoirs: number;
  totalDomaines: number;
  totalComp: number;
  enseignantsAssigned: number;
}

interface RiceHeroSectionProps {
  currentDeptLabel: string;
  filesCount: number;
  liveStats: LiveStats;
  allEnseignants: EnseignantRef[];
  ignoreEnseignants: boolean;
  effectiveEnseignants: EnseignantRef[];
  onNavigateMatchmaking: () => void;
  onReset: () => void;
}

const { Text, Title } = Typography;

const METRIC_ICONS = [
  <FileTextOutlined key="files" style={{ fontSize: 20 }} />,
  <TeamOutlined key="ens" style={{ fontSize: 20 }} />,
  <ThunderboltOutlined key="sav" style={{ fontSize: 20 }} />,
  <RobotOutlined key="aff" style={{ fontSize: 20 }} />,
];

export default function RiceHeroSection({
  currentDeptLabel,
  filesCount,
  liveStats,
  allEnseignants,
  ignoreEnseignants,
  effectiveEnseignants,
  onNavigateMatchmaking,
  onReset,
}: Readonly<RiceHeroSectionProps>) {
  const metrics = [
    {
      label: 'Fichiers',
      value: filesCount,
      note: (() => {
        if (!filesCount) return 'Aucun chargé';
        return `${filesCount} prêt${filesCount > 1 ? 's' : ''}`;
      })(),
    },
    {
      label: 'Enseignants',
      value: ignoreEnseignants ? 0 : allEnseignants.length,
      note: ignoreEnseignants ? 'Mode manuel' : 'Synchronisé',
    },
    {
      label: 'Savoirs',
      value: liveStats.totalSavoirs,
      note: `${liveStats.totalDomaines} dom. · ${liveStats.totalComp} comp.`,
    },
    {
      label: 'Enseignants affectés',
      value: liveStats.enseignantsAssigned,
      note: `sur ${effectiveEnseignants.length} disponibles`,
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
          </div>
        </div>

        <div className="rice-hero-actions">
          <Space wrap>
            <Button icon={<MergeCellsOutlined />} onClick={onNavigateMatchmaking}>
              Matchmaking
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onReset}>
              Réinitialiser
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

// Step 1 – animated circular-progress screen shown while RICE AI analysis is running.

import { Button, Space, Steps, Typography } from "antd";
import { CheckCircleOutlined, LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";

const { Title, Paragraph } = Typography;

interface AnalyzingStepProps {
  filesCount: number;
  analysisProgress: number;
  analyzeIsCanceledRef: React.RefObject<boolean>;
  progressTimerRef: React.RefObject<ReturnType<typeof setInterval> | null>;
  setAnalyzing: (v: boolean) => void;
  setCurrentStep: (step: number) => void;
  setAnalysisProgress: (v: number) => void;
}

const PROGRESS_LABELS: { max: number; text: string }[] = [
  { max: 30, text: "Lecture et extraction du texte…" },
  { max: 60, text: "Analyse NLP — taxonomie de Bloom…" },
  { max: 80, text: "Construction de l'arbre de compétences…" },
  { max: 95, text: "Matching avec le référentiel du département…" },
];

export default function AnalyzingStep({
  filesCount,
  analysisProgress,
  analyzeIsCanceledRef,
  progressTimerRef,
  setAnalyzing,
  setCurrentStep,
  setAnalysisProgress,
}: Readonly<AnalyzingStepProps>) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsedSec((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.round(analysisProgress);

  const dynamicText = useMemo(
    () => PROGRESS_LABELS.find((t) => analysisProgress < t.max)?.text ?? "Finalisation… presque prêt !",
    [analysisProgress],
  );

  const currentSubStep = useMemo(() => {
    const boundaries = [20, 40, 60, 80, 100];
    const idx = boundaries.findIndex((t) => analysisProgress < t);
    return idx === -1 ? boundaries.length : idx;
  }, [analysisProgress]);

  const stepIcon = (threshold: number, prev: number) => {
    if (analysisProgress >= threshold) return <CheckCircleOutlined style={{ color: "#10b981" }} />;
    if (analysisProgress >= prev)      return <LoadingOutlined style={{ color: "#2563eb" }} />;
    return undefined;
  };

  const handleCancel = () => {
    analyzeIsCanceledRef.current = true;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setAnalyzing(false);
    setCurrentStep(0);
    setAnalysisProgress(0);
  };

  return (
    <div className="rice-analyzing">

      {/* ── Circular progress ring ───────────────────────── */}
      <div className="rice-progress-ring-wrap">
        <div className="rice-progress-ring-bg" />
        <div
          className="rice-progress-ring-fill"
          style={{ "--pct": pct } as React.CSSProperties}
        />
        <div className="rice-progress-ring-center">
          <RobotOutlined className="rice-loading-icon" />
          <div className="rice-progress-pct">{pct}%</div>
        </div>
      </div>

      {/* ── Status text ──────────────────────────────────── */}
      <div className="rice-analyzing-text">
        <Title level={4} style={{ margin: "0 0 6px", color: "#0f172a" }}>
          {dynamicText}
        </Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
          {filesCount} fichier{filesCount > 1 ? "s" : ""} en cours d&apos;analyse · {elapsedSec}s
        </Paragraph>
      </div>

      {/* ── Sub-step list ─────────────────────────────────── */}
      <div className="rice-loading-steps">
        <Steps
          direction="vertical"
          size="small"
          current={currentSubStep}
          items={[
            {
              title: "Extraction du texte",
              description: "Lecture des fichiers PDF / DOCX",
              icon: stepIcon(20, 0),
            },
            {
              title: "Analyse NLP",
              description: "Détection des acquis d'apprentissage — taxonomie de Bloom",
              icon: stepIcon(40, 20),
            },
            {
              title: "Construction de l'arbre",
              description: "Domaines → compétences → sous-compétences → savoirs",
              icon: stepIcon(60, 40),
            },
            {
              title: "Extraction des noms d'enseignants",
              description: "Identification dans les fiches modules",
              icon: stepIcon(80, 60),
            },
            {
              title: "Matching enseignants",
              description: "Attribution IA des enseignants aux savoirs",
              icon: stepIcon(100, 80),
            },
          ]}
        />
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <Space style={{ marginTop: 4 }}>
        <Button danger onClick={handleCancel}>
          Annuler l&apos;analyse
        </Button>
        {pct >= 95 && (
          <Button
            type="primary"
            onClick={() => setCurrentStep(2)}
            style={{ background: "#10b981", borderColor: "#10b981" }}
          >
            Voir les résultats →
          </Button>
        )}
      </Space>
    </div>
  );
}

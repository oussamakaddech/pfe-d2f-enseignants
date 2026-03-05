// src/pages/competence/rice/AnalyzingStep.jsx
// Step 1 – animated progress screen shown while the RICE AI analysis is running.

import { Progress, Steps, Button } from "antd";
import { Typography } from "antd";
import { CheckCircleOutlined, LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";

const { Title, Paragraph } = Typography;

export default function AnalyzingStep({
  filesCount,
  analysisProgress,
  analyzeIsCanceledRef,
  progressTimerRef,
  setAnalyzing,
  setCurrentStep,
  setAnalysisProgress,
}) {
  const handleCancel = () => {
    analyzeIsCanceledRef.current = true;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setAnalyzing(false);
    setCurrentStep(0);
    setAnalysisProgress(0);
  };

  const currentSubStep =
    analysisProgress < 20 ? 0
    : analysisProgress < 40 ? 1
    : analysisProgress < 60 ? 2
    : analysisProgress < 80 ? 3
    : analysisProgress < 100 ? 4
    : 5;

  const stepIcon = (threshold, prev) => {
    if (analysisProgress >= threshold) return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
    if (analysisProgress >= prev)      return <LoadingOutlined />;
    return undefined;
  };

  return (
    <div className="rice-analyzing">
      <RobotOutlined className="rice-loading-icon" />
      <Title level={4} style={{ color: "#1677ff", marginBottom: 4 }}>
        Analyse en cours…
      </Title>
      <Paragraph type="secondary" style={{ maxWidth: 440, margin: "0 auto 24px" }}>
        L&apos;IA extrait les compétences, savoirs et niveaux de maîtrise
        depuis vos {filesCount} fichier(s). Merci de patienter.
      </Paragraph>

      <Progress
        percent={Math.round(analysisProgress)}
        strokeColor={{ from: "#1677ff", to: "#52c41a" }}
        style={{ maxWidth: 400, margin: "0 auto 16px" }}
        status={analysisProgress >= 100 ? "success" : "active"}
      />

      <div style={{ marginBottom: 24 }}>
        <Button danger onClick={handleCancel}>
          Annuler l&apos;analyse
        </Button>
      </div>

      <div className="rice-loading-steps">
        <Steps
          direction="vertical"
          size="small"
          current={currentSubStep}
          items={[
            {
              title: "Extraction du texte",
              description: "Lecture des fichiers PDF/DOCX",
              icon: stepIcon(20, 0),
            },
            {
              title: "Analyse NLP",
              description: "Détection des acquis d'apprentissage et taxonomie de Bloom",
              icon: stepIcon(40, 20),
            },
            {
              title: "Construction de l'arbre",
              description: "Organisation en domaines → compétences → savoirs",
              icon: stepIcon(60, 40),
            },
            {
              title: "Extraction des noms d'enseignants",
              description: "Identification des professeurs dans les fiches modules",
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
    </div>
  );
}

AnalyzingStep.propTypes = {
  filesCount: PropTypes.number.isRequired,
  analysisProgress: PropTypes.number.isRequired,
  analyzeIsCanceledRef: PropTypes.object.isRequired,
  progressTimerRef: PropTypes.object.isRequired,
  setAnalyzing: PropTypes.func.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
  setAnalysisProgress: PropTypes.func.isRequired,
};

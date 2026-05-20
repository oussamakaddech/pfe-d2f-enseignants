import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card, Row, Col, Input, Button, Tabs, Space, Typography,
  Spin, Alert, Empty, Modal, Statistic, Badge,
} from "antd";
import {
  SearchOutlined, ThunderboltOutlined, UserOutlined,
  BookOutlined, RiseOutlined,
} from "@ant-design/icons";
import { useAnalytics } from "@/hooks/analyse/useAnalytics";
import SkillGapCard from "@/components/charts/SkillGapCard";
import RecommendationCard from "@/components/charts/RecommendationCard";
import TrainingPathTimeline from "@/components/charts/TrainingPathTimeline";
import type { SkillGap } from "@/models/analyse";
import { AppPageHeader, brand, shadow } from "@/components/common";
import "@/styles/pages/teacher-analytics-page.css";

const { Text } = Typography;

const cardStyle = {
  background: "#fff",
  boxShadow: shadow.sm,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.07)",
};

export default function TeacherAnalyticsPage() {
  const { enseignantId: paramId } = useParams<{ enseignantId?: string }>();
  const [inputId, setInputId] = useState(paramId ?? "");
  const [activeId, setActiveId] = useState(paramId ?? "");
  const [selectedGap, setSelectedGap] = useState<SkillGap | null>(null);

  const {
    loading, analysing, gaps, recommendations, trainingPath, analyseResult, error,
    runAnalysis, fetchGaps, fetchRecommendations, fetchTrainingPath,
  } = useAnalytics(activeId);

  function handleSearch() {
    const id = inputId.trim();
    if (!id) return;
    setActiveId(id);
    fetchGaps(undefined, 0);
    fetchRecommendations(undefined, 0);
  }

  async function handleAnalyse() {
    if (!activeId) return;
    await runAnalysis();
    fetchGaps(undefined, 0);
    fetchRecommendations(undefined, 0);
  }

  function handleGapClick(gap: SkillGap) {
    setSelectedGap(gap);
    fetchTrainingPath(gap.competence_id);
  }

  const tabItems = [
    {
      key: "gaps",
      label: (
        <Space>
          <ThunderboltOutlined />
          Gaps de compétences
          {gaps && <Badge count={gaps.total} showZero={false} />}
        </Space>
      ),
      children: (
        <Spin spinning={loading}>
          {gaps?.gaps?.length ? (
            <Row gutter={[16, 16]}>
              {gaps.gaps.map(gap => (
                <Col key={gap.id} xs={24} sm={12} lg={8}>
                  <SkillGapCard gap={gap} onClick={handleGapClick} />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description={activeId ? "Aucun gap détecté — lancez une analyse" : "Entrez un identifiant enseignant"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      ),
    },
    {
      key: "reco",
      label: (
        <Space>
          <BookOutlined />
          Recommandations
          {recommendations && <Badge count={recommendations.total} showZero={false} />}
        </Space>
      ),
      children: (
        <Spin spinning={loading}>
          {recommendations?.recommendations?.length ? (
            <Row gutter={[16, 16]}>
              {recommendations.recommendations.map((r, i) => (
                <Col key={r.id} xs={24} sm={12} lg={8}>
                  <RecommendationCard recommendation={r} rank={i + 1} />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description={activeId ? "Aucune recommandation disponible" : "Entrez un identifiant enseignant"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        icon={<UserOutlined />}
        title="Analyse Individuelle Enseignant"
        subtitle="Gaps de compétences, recommandations et parcours de formation personnalisé"
      />

      {/* Search + actions */}
      <Card style={{ ...cardStyle, marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>Identifiant enseignant</Text>
            <Input
              size="large"
              placeholder="Ex: ENS001"
              value={inputId}
              onChange={e => setInputId(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<UserOutlined style={{ color: brand[500] }} />}
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col xs={24} md={12}>
            <div style={{ height: 28 }} />
            <Space wrap>
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading && !analysing}
                style={{ backgroundColor: brand[600], borderColor: brand[600], borderRadius: 8 }}
              >
                Charger
              </Button>
              <Button
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleAnalyse}
                loading={analysing}
                disabled={!activeId}
                style={{ borderRadius: 8 }}
              >
                Lancer l'analyse
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert message={error} type="error" showIcon closable style={{ marginBottom: 16, borderRadius: 8 }} />
      )}

      {/* Résumé analyse */}
      {analyseResult && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card style={cardStyle} size="small">
              <Statistic title="Gaps détectés" value={analyseResult.nb_gaps_detectes}
                valueStyle={{ color: "#f59e0b" }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={cardStyle} size="small">
              <Statistic title="Gaps critiques" value={analyseResult.nb_gaps_critiques}
                valueStyle={{ color: "#ef4444" }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={cardStyle} size="small">
              <Statistic title="Recommandations" value={analyseResult.nb_recommendations}
                valueStyle={{ color: "#10b981" }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={cardStyle} size="small">
              <Statistic title="Alertes générées" value={analyseResult.nb_alertes_generees}
                valueStyle={{ color: "#8b5cf6" }} />
            </Card>
          </Col>
        </Row>
      )}

      <Card style={cardStyle}>
        <Tabs items={tabItems} defaultActiveKey="gaps" />
      </Card>

      {/* Modal parcours de formation */}
      <Modal
        open={!!selectedGap}
        onCancel={() => setSelectedGap(null)}
        footer={null}
        width={680}
        title={
          <Space>
            <RiseOutlined style={{ color: brand[500] }} />
            <span>Parcours de formation — {selectedGap?.competence_nom}</span>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {trainingPath ? (
            <TrainingPathTimeline path={trainingPath} />
          ) : (
            <Empty
              description="Aucun parcours disponible pour cette compétence"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      </Modal>
    </div>
  );
}





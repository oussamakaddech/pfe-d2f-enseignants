import { useState } from "react";
import { useParams } from "react-router-dom";
import { Row, Col, Card, Tabs, Button, Space, Input, Alert, Spin, Empty } from "antd";
import { ThunderboltOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import {
  useAnalyzeTeacher,
  useTeacherGaps,
  useTeacherRecommendations,
  useTeacherRisk,
  useTeacherTrainingPath,
} from "../hooks/useAnalyticsQueries";
import {
  RiskScoreCard,
  FactorsExplanationPanel,
  GapsTable,
  RecommendationsList,
  TrainingPathStepper,
} from "../components";
import { URGENCE_COLORS } from "../constants";
import { AppPageHeader } from "@/components/common";

/**
 * Page individuelle d'un enseignant : analyse, gaps, recommandations, parcours.
 * RBAC : le backend applique la garde d'accès objet (BOLA) ; ici on masque
 * simplement les actions non autorisées côté UI.
 */
export default function AnalyticsTeacherPage() {
  const { enseignantId = "" } = useParams<{ enseignantId: string }>();
  const [urgence, setUrgence] = useState<string | undefined>();
  const [competenceId, setCompetenceId] = useState<number | null>(null);

  const analyze = useAnalyzeTeacher(enseignantId);
  const risk = useTeacherRisk(enseignantId);
  const gaps = useTeacherGaps(enseignantId, urgence);
  const recos = useTeacherRecommendations(enseignantId, competenceId ?? undefined);
  const path = useTeacherTrainingPath(enseignantId, competenceId);

  const loading = analyze.isPending || risk.isLoading || gaps.isLoading || recos.isLoading;

  return (
    <div style={{ padding: 24 }}>
      <AppPageHeader
        icon={<UserOutlined />}
        title="Analyse prédictive — Enseignant"
        actions={
          <Space>
            <Input value={enseignantId} disabled placeholder="ID enseignant" style={{ width: 220 }} />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={analyze.isPending}
              onClick={() => analyze.mutate()}
            >
              Lancer l'analyse
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => risk.refetch()}>
              Rafraîchir
            </Button>
          </Space>
        }
      />

      {analyze.isError && (
        <Alert type="error" showIcon message="Échec du lancement de l'analyse." style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <RiskScoreCard risk={risk.data} loading={risk.isLoading} />
        </Col>
        <Col xs={24} md={16}>
          <FactorsExplanationPanel facteurs={risk.data?.facteurs} loading={risk.isLoading} />
        </Col>
      </Row>

      <Card style={{ marginTop: 16, borderRadius: 12 }}>
        <Tabs
          items={[
            {
              key: "gaps",
              label: "Gaps de compétences",
              children: (
                <div>
                  <Space style={{ marginBottom: 12 }}>
                    {(["FAIBLE", "MODEREE", "HAUTE", "CRITIQUE"] as const).map((u) => (
                      <Button
                        key={u}
                        size="small"
                        type={urgence === u ? "primary" : "default"}
                        onClick={() => setUrgence(urgence === u ? undefined : u)}
                      >
                        {u}
                      </Button>
                    ))}
                  </Space>
                  {gaps.isLoading ? (
                    <Spin />
                  ) : gaps.data?.gaps.length ? (
                    <GapsTable
                      gaps={gaps.data.gaps}
                      loading={gaps.isLoading}
                      onRowClick={(g) => setCompetenceId(g.competence_id)}
                    />
                  ) : (
                    <Empty description="Aucun gap — lancez une analyse" />
                  )}
                </div>
              ),
            },
            {
              key: "recos",
              label: "Recommandations",
              children: (
                <RecommendationsList recommendations={recos.data?.recommendations ?? []} loading={recos.isLoading} />
              ),
            },
            {
              key: "path",
              label: "Parcours de formation",
              children: <TrainingPathStepper path={path.data} loading={path.isLoading} />,
            },
          ]}
        />
      </Card>

      {loading && <div style={{ marginTop: 16 }} />}
    </div>
  );
}

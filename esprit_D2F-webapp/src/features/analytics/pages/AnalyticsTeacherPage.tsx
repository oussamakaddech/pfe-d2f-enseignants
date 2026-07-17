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
  useRiskHistory,
  useAlerts,
  useUpdateAlert,
} from "../hooks/useAnalyticsQueries";
import {
  RiskScoreCard,
  FactorsExplanationPanel,
  GapsTable,
  RecommendationsList,
  TrainingPathStepper,
  RiskHistoryChart,
  ImpactPanel,
  AlertCenter,
} from "../components";
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
  const history = useRiskHistory(enseignantId);

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
                  <GapsTab
                    gaps={gaps}
                    onSelectCompetence={(g) => setCompetenceId(g.competence_id)}
                  />
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
            {
              key: "history",
              label: "Historique du risque",
              children: <RiskHistoryChart points={history.data?.points ?? []} loading={history.isLoading} />,
            },
            {
              key: "impact",
              label: "Impact estimé",
              children: (
                <ImpactPanel
                  enseignantId={enseignantId}
                  gaps={gaps.data?.gaps ?? []}
                  recommendations={recos.data?.recommendations ?? []}
                />
              ),
            },
            {
              key: "alertes",
              label: "Alertes",
              children: <TeacherAlerts enseignantId={enseignantId} />,
            },
          ]}
        />
      </Card>

      {loading && <div style={{ marginTop: 16 }} />}
    </div>
  );
}

/** Onglet Alertes de l'enseignant (F2) : cycle de vie + action contextuelle. */
function TeacherAlerts({ enseignantId }: { readonly enseignantId: string }) {
  const { data, isLoading } = useAlerts({ enseignant_id: enseignantId });
  const update = useUpdateAlert();
  return (
    <AlertCenter
      alerts={data?.alerts ?? []}
      loading={isLoading}
      onUpdate={(id, payload) => update.mutate({ id, payload })}
    />
  );
}

/** Contenu de l'onglet Gaps : spinner, tableau ou état vide. */
function GapsTab({
  gaps,
  onSelectCompetence,
}: {
  readonly gaps: ReturnType<typeof useTeacherGaps>;
  readonly onSelectCompetence: (g: { competence_id: number }) => void;
}) {
  if (gaps.isLoading) return <Spin />;
  if (gaps.data?.gaps.length) {
    return (
      <GapsTable
        gaps={gaps.data.gaps}
        loading={gaps.isLoading}
        onRowClick={(g) => onSelectCompetence(g)}
      />
    );
  }
  return <Empty description="Aucun gap — lancez une analyse" />;
}

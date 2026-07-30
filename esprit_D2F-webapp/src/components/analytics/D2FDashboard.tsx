/**
 * D2F Dashboard Component
 *
 * Consumes ONLY /api/v1/d2f/* endpoints (master dataset source of truth).
 * Replaces the legacy AnalyticsService with consistent KPIs, alerts,
 * recommendations, and teacher profiles computed from the master dataset.
 *
 * Features:
 * - French business labels everywhere
 * - Tooltips in French for risk, gap critique, couverture, stagnation, régression, impact
 * - Loading / empty / error states handled cleanly
 * - Feedback loop (training-complete) with full risk recompute
 * - No hardcoded KPI values
 */

import { useMemo, useState } from "react";
import {
  Row, Col, Card, Tag, Alert, Empty, Skeleton, Tooltip, Button, Statistic,
  Table, Progress, Modal, Select, Space, message,
} from "antd";
import {
  TeamOutlined, AlertOutlined, LineChartOutlined, WarningOutlined,
  ReloadOutlined, InfoCircleOutlined, SafetyCertificateOutlined,
  RiseOutlined, FallOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import {
  useD2FKPIs, useD2FAtRisk, useD2FCritical,
  useD2FAlerts, useD2FRecommendations, useD2FTeachers,
  useD2FTeacherProfile, useMarkTrainingCompleted,
} from "@/hooks/analyse/useD2FData";
import type { ColumnsType } from "antd/es/table";
import type {
  AtRiskTeacherRow, D2FAlert, D2FRecommendation, TeacherSummary,
} from "@/services/analyse/D2FService";

// ── Tooltip Definitions (in French) ─────────────────────
const KPI_TOOLTIPS: Record<string, string> = {
  total_teachers: "Nombre total d'enseignants uniques dans le dataset maître (un seul identifiant, un seul département, une seule UP).",
  enseignants_a_risque: "Enseignants avec score de risque supérieur ou égal à 0,50 (sur l'échelle [0,1]). Indique un besoin de formation proactive.",
  enseignants_critiques: "Enseignants avec score de risque supérieur ou égal à 0,75. Situation urgente nécessitant une action immédiate (entretien, parcours prioritaire).",
  score_risque_moyen: "Moyenne des scores de risque sur tous les enseignants. Calculée via la formule officielle: 40% gaps critiques + 25% couverture + 20% stagnation + 15% régression.",
  taux_couverture_global: "Pourcentage des couples (enseignant × compétence) où le niveau actuel atteint ou dépasse le niveau requis. Indique la maturité globale des compétences.",
  nb_gaps_critiques: "Nombre de compétences où l'écart entre niveau requis et actuel est supérieur ou égal à 3 (échelle 1-5).",
  nb_alertes_nouvelles: "Alertes non encore traitées (statut NOUVELLE). Chaque alerte référence un enseignant réel et un gap réel.",
  nb_recommandations: "Recommandations de formation actives, chacune expliquant pourquoi elle est pertinente (explication_fr).",
};

// ── Helper Components ──────────────────────────────────

function RiskTag({ level, score }: { level: string; score: number }) {
  const config: Record<string, { color: string; label: string }> = {
    CRITIQUE: { color: "red", label: "Critique" },
    ELEVE: { color: "orange", label: "Élevé" },
    MODERE: { color: "gold", label: "Modéré" },
    FAIBLE: { color: "green", label: "Faible" },
  };
  const c = config[level] ?? { color: "default", label: level };
  return (
    <Tag color={c.color}>
      {c.label} ({score.toFixed(2)})
    </Tag>
  );
}

function KPICard({
  title, value, icon, color, loading, tooltip, suffix, precision = 2,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  tooltip?: string;
  suffix?: string;
  precision?: number;
}) {
  return (
    <Card
      size="small"
      loading={loading}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28, color }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#666", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            {title}
            {tooltip && (
              <Tooltip title={tooltip}>
                <InfoCircleOutlined style={{ fontSize: 11 }} />
              </Tooltip>
            )}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {value !== undefined ? value.toFixed(precision) : "···"}
            {suffix && <span style={{ fontSize: 14, color: "#999", marginLeft: 4 }}>{suffix}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────

interface D2FDashboardProps {
  defaultTeacherId?: string;
}

export function D2FDashboard({ defaultTeacherId }: D2FDashboardProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>(defaultTeacherId);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<string | undefined>(undefined);

  // Queries — all from /api/v1/d2f/*
  const kpisQ = useD2FKPIs();
  const atRiskQ = useD2FAtRisk();
  const criticalQ = useD2FCritical();
  const alertsQ = useD2FAlerts(alertFilter);
  const recsQ = useD2FRecommendations();
  const teachersQ = useD2FTeachers({ limit: 100 });
  const profileQ = useD2FTeacherProfile(selectedTeacherId);

  const trainingMutation = useMarkTrainingCompleted();

  // ── At-Risk Table Columns ────────────────────────────
  const atRiskColumns: ColumnsType<AtRiskTeacherRow> = useMemo(() => [
    {
      title: "Enseignant",
      dataIndex: "teacher_name",
      key: "name",
      render: (name: string, row) => (
        <a onClick={() => { setSelectedTeacherId(row.teacher_id); setProfileModalOpen(true); }}>
          {name}
        </a>
      ),
    },
    { title: "Département", dataIndex: "department", key: "dept" },
    {
      title: "Score de risque",
      dataIndex: "risk_score",
      key: "risk",
      sorter: (a, b) => a.risk_score - b.risk_score,
      render: (score: number, row) => <RiskTag level={row.risk_level} score={score} />,
    },
    {
      title: "Gaps critiques",
      dataIndex: "n_critical_gaps",
      key: "gaps",
      render: (n: number) => (
        <Tag color={n > 2 ? "red" : n > 0 ? "orange" : "default"}>{n}</Tag>
      ),
    },
    {
      title: "Top gaps",
      dataIndex: "top_gaps",
      key: "top",
      render: (gaps: { competence_nom: string; gap_value: number }[]) => (
        <Space direction="vertical" size={2}>
          {gaps.slice(0, 2).map((g, i) => (
            <span key={i} style={{ fontSize: 12 }}>
              {g.competence_nom} <Tag color={g.gap_value >= 3 ? "red" : "default"}>Δ {g.gap_value}</Tag>
            </span>
          ))}
        </Space>
      ),
    },
  ], []);

  // ── Alerts Columns ───────────────────────────────────
  const alertColumns: ColumnsType<D2FAlert> = useMemo(() => [
    {
      title: "Sévérité",
      dataIndex: "severity",
      key: "sev",
      render: (sev: string) => (
        <Tag color={sev === "CRITIQUE" ? "red" : "orange"}>{sev}</Tag>
      ),
    },
    { title: "Enseignant", dataIndex: "teacher_id", key: "teacher" },
    { title: "Type", dataIndex: "type", key: "type" },
    { title: "Message", dataIndex: "message", key: "msg" },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <Tag>{s}</Tag>,
    },
    { title: "Date", dataIndex: "created_at", key: "date" },
  ], []);

  // ── Recommendations Columns ──────────────────────────
  const recColumns: ColumnsType<D2FRecommendation> = useMemo(() => [
    {
      title: "Priorité",
      dataIndex: "priority",
      key: "priority",
      render: (p: string) => (
        <Tag color={p === "HAUTE" ? "red" : "gold"}>{p}</Tag>
      ),
    },
    { title: "Enseignant", dataIndex: "teacher_id", key: "teacher" },
    { title: "Formation", dataIndex: "training_title", key: "training" },
    {
      title: "Compétence cible",
      dataIndex: "target_competency_code",
      key: "comp",
    },
    {
      title: "Réduction de risque attendue",
      dataIndex: "expected_risk_reduction",
      key: "rr",
      render: (v: number) => <Tag color="green">−{v.toFixed(2)}</Tag>,
    },
    {
      title: "Explication",
      dataIndex: "explanation_fr",
      key: "expl",
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ fontSize: 12, color: "#555" }}>{text.slice(0, 40)}…</span>
        </Tooltip>
      ),
    },
  ], []);

  // ── Teacher Selection ────────────────────────────────
  const teacherOptions = useMemo(() =>
    (teachersQ.data?.teachers ?? []).map((t: TeacherSummary) => ({
      value: t.teacher_id,
      label: `${t.full_name} (${t.risk_level})`,
    })),
    [teachersQ.data]
  );

  // ── Training Completion Handler ─────────────────────
  const handleTrainingComplete = async (teacherId: string, trainingCode: string) => {
    try {
      const result = await trainingMutation.mutateAsync({ teacherId, trainingCode });
      message.success(
        `Risque recalculé: ${result.old_risk_score.toFixed(2)} → ${result.new_risk_score.toFixed(2)} (${result.risk_reduction.toFixed(2)} de réduction)`
      );
    } catch {
      message.error("Échec du recompute. Voir la console pour le détail.");
    }
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <Alert
        message="Source unique de vérité: /api/v1/d2f/*"
        description="Tous les chiffres de ce dashboard sont calculés depuis le dataset maître D2F (30 enseignants, 6 départements, 12 compétences). Aucune valeur n'est codée en dur."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              kpisQ.refetch();
              atRiskQ.refetch();
              criticalQ.refetch();
              alertsQ.refetch();
              recsQ.refetch();
            }}
          >
            Rafraîchir
          </Button>
        }
      />

      {/* ── KPI Cards Row ───────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Enseignants"
            value={kpisQ.data?.total_teachers}
            icon={<TeamOutlined />}
            color="#1890ff"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.total_teachers}
            precision={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="À risque (≥ 0,50)"
            value={kpisQ.data?.enseignants_a_risque}
            icon={<WarningOutlined />}
            color="#fa8c16"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.enseignants_a_risque}
            precision={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Critiques (≥ 0,75)"
            value={kpisQ.data?.enseignants_critiques}
            icon={<SafetyCertificateOutlined />}
            color="#f5222d"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.enseignants_critiques}
            precision={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Risque moyen"
            value={kpisQ.data?.score_risque_moyen}
            icon={<LineChartOutlined />}
            color="#722ed1"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.score_risque_moyen}
            precision={3}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Couverture globale"
            value={kpisQ.data?.taux_couverture_global}
            suffix="%"
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.taux_couverture_global}
            precision={1}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Gaps critiques"
            value={kpisQ.data?.nb_gaps_critiques}
            icon={<AlertOutlined />}
            color="#fa541c"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.nb_gaps_critiques}
            precision={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Alertes nouvelles"
            value={kpisQ.data?.nb_alertes_nouvelles}
            icon={<AlertOutlined />}
            color="#fa8c16"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.nb_alertes_nouvelles}
            precision={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KPICard
            title="Recommandations"
            value={kpisQ.data?.nb_recommandations}
            icon={<RiseOutlined />}
            color="#13c2c2"
            loading={kpisQ.isLoading}
            tooltip={KPI_TOOLTIPS.nb_recommandations}
            precision={0}
          />
        </Col>
      </Row>

      {/* ── At-Risk Table ───────────────────────────── */}
      <Card
        title={
          <Space>
            <WarningOutlined />
            <span>Enseignants à risque</span>
            <Tag color="orange">{atRiskQ.data?.total_at_risk ?? 0}</Tag>
            <Tooltip title="Seuil = 0,50. Tous les scores viennent de la formule unique documentée dans le DATASET_CONTRACT.md.">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => atRiskQ.refetch()}
          >
            Actualiser
          </Button>
        }
      >
        {atRiskQ.isLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : atRiskQ.isError ? (
          <Alert
            message="Impossible de charger les enseignants à risque"
            description="Vérifiez que le service FastAPI répond et que la base de données est seedée."
            type="error"
            showIcon
          />
        ) : (atRiskQ.data?.teachers.length ?? 0) === 0 ? (
          <Empty description="Aucun enseignant à risque détecté" />
        ) : (
          <Table
            rowKey="teacher_id"
            size="small"
            dataSource={atRiskQ.data?.teachers ?? []}
            columns={atRiskColumns}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* ── Alerts ──────────────────────────────────── */}
      <Card
        title={
          <Space>
            <AlertOutlined />
            <span>Alertes</span>
            <Tag>{alertsQ.data?.total ?? 0}</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Select
            allowClear
            placeholder="Filtrer par statut"
            style={{ width: 180 }}
            onChange={(v) => setAlertFilter(v)}
            options={[
              { value: "NOUVELLE", label: "Nouvelle" },
              { value: "LUE", label: "Lue" },
              { value: "EN_COURS", label: "En cours" },
              { value: "RESOLUE", label: "Résolue" },
            ]}
          />
        }
      >
        {alertsQ.isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : alertsQ.isError ? (
          <Alert type="error" message="Échec du chargement des alertes" />
        ) : (alertsQ.data?.alerts.length ?? 0) === 0 ? (
          <Empty description="Aucune alerte" />
        ) : (
          <Table
            rowKey="alert_id"
            size="small"
            dataSource={alertsQ.data?.alerts ?? []}
            columns={alertColumns}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* ── Recommendations ─────────────────────────── */}
      <Card
        title={
          <Space>
            <RiseOutlined />
            <span>Recommandations de formation</span>
            <Tag color="cyan">{recsQ.data?.total ?? 0}</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {recsQ.isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : recsQ.isError ? (
          <Alert type="error" message="Échec du chargement des recommandations" />
        ) : (recsQ.data?.recommendations.length ?? 0) === 0 ? (
          <Empty description="Aucune recommandation active" />
        ) : (
          <Table
            rowKey="recommendation_id"
            size="small"
            dataSource={recsQ.data?.recommendations ?? []}
            columns={recColumns}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* ── Teacher Profile Modal (with feedback loop) ── */}
      <Modal
        title="Profil enseignant"
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        width={900}
        footer={null}
      >
        {profileQ.isLoading ? (
          <Skeleton active />
        ) : profileQ.isError ? (
          <Alert type="error" message="Échec du chargement du profil" />
        ) : profileQ.data ? (
          <div>
            <Card size="small" style={{ marginBottom: 12 }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <strong>{profileQ.data.teacher.full_name as string}</strong>
                  <Tag style={{ marginLeft: 8 }}>
                    {profileQ.data.teacher.department_code as string}
                  </Tag>
                  <Tag>{profileQ.data.teacher.up_code as string}</Tag>
                </div>
                <div>
                  <RiskTag
                    level={profileQ.data.risk_profile.risk_level}
                    score={profileQ.data.risk_profile.risk_score}
                  />
                  <span style={{ marginLeft: 12 }}>
                    Gap moyen: {profileQ.data.risk_profile.avg_gap.toFixed(2)}
                  </span>
                  <span style={{ marginLeft: 12 }}>
                    Gaps critiques: {profileQ.data.risk_profile.n_critical_gaps}
                  </span>
                </div>
              </Space>
            </Card>

            <h4>
              Compétences
              <Tooltip title="Liste des compétences suivies avec niveau actuel vs requis. Un gap est critique si ≥ 3 (sur échelle 1-5).">
                <InfoCircleOutlined style={{ marginLeft: 6 }} />
              </Tooltip>
            </h4>
            <Table
              size="small"
              rowKey={(r) => `${r.teacher_id}-${r.competence_code}`}
              dataSource={profileQ.data.gaps}
              pagination={false}
              columns={[
                { title: "Compétence", dataIndex: "competence_nom" },
                { title: "Actuel", dataIndex: "current_level" },
                { title: "Requis", dataIndex: "required_level" },
                {
                  title: "Gap",
                  dataIndex: "gap_value",
                  render: (v: number, r: { is_critical_gap: boolean }) => (
                    <Tag color={r.is_critical_gap ? "red" : "default"}>Δ {v}</Tag>
                  ),
                },
              ]}
            />

            <h4 style={{ marginTop: 16 }}>
              Feedback loop (boucle d'apprentissage)
              <Tooltip title="Marquer une formation comme terminée déclenche le recalcul complet du profil de risque (formule officielle, pas un -0.1 simplifié).">
                <InfoCircleOutlined style={{ marginLeft: 6 }} />
              </Tooltip>
            </h4>
            <Select
              placeholder="Choisir une formation à terminer"
              style={{ width: "100%", marginBottom: 8 }}
              options={(profileQ.data.recommendations ?? []).map((r) => ({
                value: r.training_code,
                label: `${r.training_title} (cible: ${r.target_competency_code})`,
              }))}
              onChange={(v) => selectedTeacherId && handleTrainingComplete(selectedTeacherId, v)}
            />

            {profileQ.data.alerts.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>Alertes actives</h4>
                {profileQ.data.alerts.map((a) => (
                  <Alert
                    key={a.alert_id}
                    type={a.severity === "CRITIQUE" ? "error" : "warning"}
                    message={a.message}
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default D2FDashboard;

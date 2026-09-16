import { useNavigate } from "react-router-dom";
import { Section, Card } from "@/redesign/components/Section";
import CompactKpi from "@/redesign/components/CompactKpi";
import { KpiSkeleton, ErrorState } from "@/redesign/components/States";
import { usePilotageDashboard } from "@/hooks/analyse/usePilotageDashboard";
import {
  RiseOutlined, TeamOutlined, WarningOutlined, NodeIndexOutlined,
  CheckCircleOutlined, FallOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { Table, Tag, Alert, List, Progress, Empty } from "antd";
import "@/redesign/redesign.css";

const POS_COLOR: Record<string, string> = { AU_DESSUS: "success", EN_DECA: "error" };
const SEV_COLOR: Record<string, string> = { INFO: "blue", WARNING: "warning", CRITICAL: "error" };

/**
 * Synthèse compacte du tableau de bord de pilotage (nouvelles analyses backend).
 * Réutilisable sur la page « Tableau de bord » et « Analyse Prédictive ».
 */
export default function PilotageSummary({ horizon = 6 }: { readonly horizon?: number }) {
  const { data, isLoading, isError, refetch } = usePilotageDashboard(horizon);
  const navigate = useNavigate();

  return (
    <Section
      title="Pilotage prévisionnel"
      subtitle="Synthèse des nouvelles analyses : projection des niveaux, benchmark départements, anomalies live, corrélation besoins ↔ gaps"
      extra={
        <button
          type="button"
          className="rd-btn rd-btn-ghost"
          onClick={() => navigate("/home/analytics/pilotage")}
        >
          Tableau complet <ArrowRightOutlined />
        </button>
      }
    >
      {isLoading && <KpiSkeleton count={4} />}
      {isError && (
        <ErrorState message="Erreur de chargement du pilotage." onRetry={() => refetch()} />
      )}

      {data && (
        <>
          {/* ── KPIs forecast + anomalies ── */}
          <div className="rd-kpi-grid">
            <CompactKpi
              label="Niveau projeté moyen"
              value={data.forecast_kpis.niveau_projet_moyen}
              unit="custom"
              customText={data.forecast_kpis.niveau_projet_moyen.toFixed(2)}
              icon={<RiseOutlined />}
              accent="#1677ff"
              accentBg="rgba(22,119,255,0.10)"
            />
            <CompactKpi
              label="% objectifs atteignables"
              value={data.forecast_kpis.pct_objectifs_atteignables}
              unit="pct"
              icon={<CheckCircleOutlined />}
              accent="#52c41a"
              accentBg="rgba(82,196,26,0.10)"
            />
            <CompactKpi
              label="Compétences en régression"
              value={data.forecast_kpis.nb_competences_regression}
              unit="int"
              icon={<FallOutlined />}
              accent="#faad14"
              accentBg="rgba(250,173,21,0.10)"
            />
            <CompactKpi
              label="Anomalies live"
              value={data.anomalies_live.nb_anomalies_recentes}
              unit="int"
              icon={<WarningOutlined />}
              accent="#ff4d4f"
              accentBg="rgba(255,77,79,0.10)"
            />
          </div>

          {/* ── Benchmark + Corrélation ── */}
          <div className="rd-grid-2" style={{ marginTop: 16 }}>
            <Card title="Benchmark départements" subtitle="Écart vs cohorte" icon={<TeamOutlined />}>
              {data.benchmark_departements.length === 0 ? (
                <Empty description="Aucune donnée département" />
              ) : (
                <Table
                  rowKey="departement_id"
                  size="small"
                  pagination={false}
                  dataSource={data.benchmark_departements.slice(0, 5)}
                  columns={[
                    { title: "Département", dataIndex: "departement_id", key: "departement_id" },
                    {
                      title: "Niveau", dataIndex: "niveau_moyen", key: "niveau_moyen",
                      render: (v: number) => v.toFixed(2),
                    },
                    {
                      title: "Écart", dataIndex: "ecart_vs_cohorte", key: "ecart_vs_cohorte",
                      render: (v: number) => {
                        const color = v >= 0 ? "success" : "error";
                        const sign = v >= 0 ? "+" : "";
                        return (
                          <Tag color={color}>
                            {sign}{v.toFixed(2)}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: "Position", dataIndex: "position", key: "position",
                      render: (p: string) => <Tag color={POS_COLOR[p]}>{p}</Tag>,
                    },
                  ]}
                />
              )}
            </Card>

            <Card title="Corrélation besoins ↔ gaps" icon={<NodeIndexOutlined />}>
              <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--rd-muted)" }}>Coefficient de Pearson</div>
                  <div style={{ fontSize: 28, fontWeight: 600 }}>
                    {data.correlation_besoins_gaps.coefficient_pearson == null
                      ? "—"
                      : data.correlation_besoins_gaps.coefficient_pearson.toFixed(2)}
                  </div>
                </div>
                <Tag color="blue">{data.correlation_besoins_gaps.interpretation}</Tag>
              </div>
              <Progress
                percent={Math.round(Math.abs(data.correlation_besoins_gaps.coefficient_pearson ?? 0) * 100)}
                showInfo={false}
                strokeColor="#1677ff"
              />
              {data.anomalies_live.alertes.length > 0 && (
                <List
                  size="small"
                  style={{ marginTop: 12 }}
                  dataSource={data.anomalies_live.alertes.slice(0, 3)}
                  renderItem={(a) => (
                    <List.Item>
                      <Tag color={SEV_COLOR[a.severite]}>{a.severite}</Tag>
                      <span style={{ fontSize: 12.5 }}><strong>{a.titre}</strong> — {a.message}</span>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>

          {data.anomalies_live.nb_anomalies_recentes > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
              message={`${data.anomalies_live.nb_anomalies_recentes} anomalie(s) détectée(s) sur ${data.anomalies_live.fenetre_jours} jours · ${data.anomalies_live.nb_nouvelles} nouvelle(s)`}
            />
          )}
        </>
      )}
    </Section>
  );
}

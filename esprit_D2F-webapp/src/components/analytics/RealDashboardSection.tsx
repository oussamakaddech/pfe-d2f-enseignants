import { Alert, Empty, Spin, Table, Tag, Tooltip } from "antd";
import {
  DatabaseOutlined, CheckCircleFilled, WarningOutlined,
  DashboardOutlined, UserOutlined, TrophyOutlined, AimOutlined,
} from "@ant-design/icons";
import { useRealDashboardImpact } from "@/hooks/analytics/useAnalyticsQueries";
import type { RealDashboardImpact } from "@/models/analyse/analyticsFeature";

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "#dc2626", CRITIQUE: "#dc2626",
  HIGH: "#ea580c", ELEVE: "#ea580c",
  MEDIUM: "#d97706", MODERE: "#d97706",
  LOW: "#16a34a", FAIBLE: "#16a34a",
};

function severityFromGap(score: number): { label: string; color: string } {
  if (score >= 0.75) return { label: "Critique", color: "#dc2626" };
  if (score >= 0.5) return { label: "Élevée", color: "#ea580c" };
  if (score >= 0.25) return { label: "Modérée", color: "#d97706" };
  return { label: "Faible", color: "#16a34a" };
}

function SourceBadge({ source }: { source: "database" | "csv" }) {
  const isDb = source === "database";
  return (
    <Tooltip title={isDb
      ? "Donnees reelles issues des tables analyse.skill_gaps / teacher_risk_snapshots / alert_events"
      : "Donnees de demonstration (CSV legacy data/clean)"}>
      <Tag
        color={isDb ? "success" : "warning"}
        icon={isDb ? <CheckCircleFilled /> : <WarningOutlined />}
        style={{ fontWeight: 600 }}
      >
        {isDb ? "Donnees reelles (base)" : "Donnees demo (CSV legacy)"}
      </Tag>
    </Tooltip>
  );
}

/**
 * Section "Impact reel" du dashboard : affiche KPIs + heatmap + top at-risk
 * calcules depuis la vraie base PostgreSQL.
 * A placer en haut de AnalyticsDashboardPage, avant le contenu legacy.
 */
export default function RealDashboardSection() {
  const { data, isLoading, isError, error } = useRealDashboardImpact();

  if (isLoading) {
    return (
      <div className="ad-card ad-real-section" style={{ padding: 40, textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 12 }}>Chargement des donnees reelles...</div>
      </div>
    );
  }
  if (isError) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Donnees reelles indisponibles"
        description={(error as Error)?.message ?? "Endpoint /dashboard/real/impact inaccessible"}
      />
    );
  }
  if (!data) return <Empty description="Pas de donnees" />;

  const kpis = data.kpis;

  return (
    <div className="ad-card ad-real-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DatabaseOutlined style={{ fontSize: 20, color: "#2563eb" }} />
          <h3 style={{ margin: 0 }}>Impact reel — Donnees metier</h3>
          <SourceBadge source="database" />
        </div>
        {data.model && (
          <Tag color="blue" icon={<AimOutlined />}>
            {data.model.mode ?? "ML"} v{data.model.version?.slice(0, 10) ?? "?"}
          </Tag>
        )}
      </div>

      {/* KPIs principaux */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Enseignants suivis" value={kpis.nb_enseignants} icon={<UserOutlined />} />
        <KpiCard label="Avec gaps calcules" value={kpis.nb_enseignants_avec_gaps} icon={<DashboardOutlined />} tone="info" />
        <KpiCard label="Gaps CRITIQUES" value={kpis.nb_gaps_critiques} icon={<WarningOutlined />} tone="danger" />
        <KpiCard label="Gaps HAUTE" value={kpis.nb_gaps_haute} tone="warning" />
        <KpiCard label="Score moyen de risque" value={kpis.avg_risk_score?.toFixed(2) ?? "—"} tone="warning" />
        <KpiCard label="Taux couverture %" value={`${kpis.taux_couverture_pct?.toFixed(0) ?? "—"}%`} />
        <KpiCard label="Alertes non traitees" value={kpis.nb_alertes_non_traitees} tone="info" />
        <KpiCard label="Alertes critiques" value={kpis.nb_alertes_critiques} tone="danger" />
      </div>

      {/* Heatmap par departement */}
      <HeatmapReal heatmap={data.heatmap} />

      {/* Top enseignants a risque */}
      <AtRiskRealTable rows={data.at_risk_teachers} />

      {/* Top formations recommandees */}
      <TopFormationsReal rows={data.top_formations} />
    </div>
  );
}

/* ── Sous-composants ─────────────────────────────────────────── */

function KpiCard({
  label, value, icon, tone = "primary",
}: { label: string; value: string | number; icon?: React.ReactNode; tone?: "primary" | "warning" | "danger" | "info" }) {
  const colors: Record<string, string> = {
    primary: "#2563eb",
    info: "#0ea5e9",
    warning: "#d97706",
    danger: "#dc2626",
  };
  return (
    <div style={{
      background: "var(--at-surface2, #f8f9fc)",
      border: `1px solid var(--at-border, #e2e6ee)`,
      borderLeft: `4px solid ${colors[tone]}`,
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ fontSize: 11, color: "var(--at-ink3, #94a3b8)", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: colors[tone] }}>{value}</div>
    </div>
  );
}

function HeatmapReal({ heatmap }: { heatmap: RealDashboardImpact["heatmap"] }) {
  // Pivot dept x competence
  const deptSet = new Set<string>();
  const compSet = new Set<string>();
  const cellMap = new Map<string, RealDashboardImpact["heatmap"][0]>();
  for (const row of heatmap) {
    const dept = row.dept_libelle ?? row.dept_id ?? "Sans departement";
    const comp = row.competence_nom ?? row.competence_code;
    deptSet.add(dept);
    compSet.add(comp);
    cellMap.set(`${dept}::${comp}`, row);
  }

  if (deptSet.size === 0) return <Empty description="Aucune heatmap calculee" style={{ marginTop: 8 }} />;

  return (
    <div style={{ marginBottom: 24, overflowX: "auto" }}>
      <h4 style={{ marginBottom: 12 }}>Heatmap Gaps moyens — par Département × Compétence</h4>
      <Table
        size="small"
        pagination={false}
        bordered
        scroll={{ x: true }}
        dataSource={Array.from(deptSet).map((dept) => ({ dept }))}
        rowKey={(r) => r.dept}
        columns={[
          { title: "Departement", dataIndex: "dept", fixed: "left", width: 200 },
          ...Array.from(compSet).map((comp) => ({
            title: <Tooltip title={comp}>{comp.length > 14 ? comp.slice(0, 12) + "…" : comp}</Tooltip>,
            key: comp,
            align: "center" as const,
            render: (_: unknown, r: { dept: string }) => {
              const cell = cellMap.get(`${r.dept}::${comp}`);
              if (!cell) return <span style={{ color: "var(--at-ink3)" }}>·</span>;
              const sev = severityFromGap(cell.avg_gap_score);
              return (
                <Tooltip
                  title={`${cell.nb_enseignants_touches} enseignants, avg=${(cell.avg_gap_score * 100).toFixed(0)}%, ${cell.nb_critiques} critiques`}
                >
                  <span style={{ color: sev.color, fontWeight: 600 }}>
                    {(cell.avg_gap_score * 100).toFixed(0)}%
                    <span style={{ display: "block", fontSize: 10, opacity: 0.8 }}>({cell.nb_enseignants_touches} ens.)</span>
                  </span>
                </Tooltip>
              );
            },
          })),
        ]}
      />
    </div>
  );
}

function AtRiskRealTable({ rows }: { rows: RealDashboardImpact["at_risk_teachers"] }) {
  if (!rows.length) return <Empty description="Aucun enseignant a risque" style={{ marginTop: 8 }} />;
  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ marginBottom: 12 }}>
        Enseignants a risque <Tag color="error">{rows.length}</Tag>
      </h4>
      <Table
        size="small"
        pagination={rows.length > 10 ? { pageSize: 10 } : false}
        dataSource={rows}
        rowKey="enseignant_id"
        columns={[
          {
            title: "Enseignant",
            key: "nom",
            render: (_, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.prenom} {r.nom}</div>
                <div style={{ fontSize: 11, color: "var(--at-ink3)" }}>{r.specialite ?? "Specialite N/R"}</div>
              </div>
            ),
          },
          { title: "Departement", dataIndex: "dept_libelle", key: "dept" },
          { title: "UP", dataIndex: "up_libelle", key: "up" },
          {
            title: "Score risque",
            dataIndex: "score_risque",
            key: "risque",
            render: (v: number) => (
              <Tag color={RISK_COLOR[v >= 75 ? "CRITICAL" : v >= 50 ? "HIGH" : v >= 30 ? "MEDIUM" : "LOW"]}>
                {v.toFixed(0)}%
              </Tag>
            ),
          },
          { title: "Niveau", dataIndex: "niveau_risque", key: "niveau" },
          { title: "Gaps critiques", dataIndex: "nb_gaps_critiques", key: "gaps" },
        ]}
      />
    </div>
  );
}

function TopFormationsReal({ rows }: { rows: RealDashboardImpact["top_formations"] }) {
  if (!rows.length) return <Empty description="Aucune formation recommandee" style={{ marginTop: 8 }} />;
  return (
    <div>
      <h4 style={{ marginBottom: 12 }}>
        <TrophyOutlined /> Formations les plus recommandees <Tag color="blue">{rows.length}</Tag>
      </h4>
      <Table
        size="small"
        pagination={rows.length > 8 ? { pageSize: 8 } : false}
        dataSource={rows}
        rowKey={(r) => `${r.formation_id}-${r.competence_id ?? 0}`}
        columns={[
          { title: "Formation", dataIndex: "titre_formation", key: "titre" },
          { title: "Competence cible", dataIndex: "competence_nom", key: "comp", render: (v: string | null) => v ?? "—" },
          { title: "Recommandations", dataIndex: "nb_recommandations", key: "reco" },
          { title: "Enseignants concernes", dataIndex: "nb_enseignants", key: "ens" },
          {
            title: "Score moyen",
            dataIndex: "score_moyen",
            key: "score",
            render: (v: number) => <b>{v.toFixed(2)}</b>,
          },
          {
            title: "En attente",
            dataIndex: "en_attente",
            key: "attente",
            render: (v: number) => <Tag color={v > 5 ? "warning" : "default"}>{v}</Tag>,
          },
        ]}
      />
    </div>
  );
}

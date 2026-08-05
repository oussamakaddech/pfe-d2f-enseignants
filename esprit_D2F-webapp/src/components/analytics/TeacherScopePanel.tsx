import { Tag, Tooltip, Progress, Empty, Spin, Table } from "antd";
import {
  AimOutlined, ApartmentOutlined, BookOutlined, CheckCircleFilled,
  AlertOutlined, ThunderboltOutlined, UserOutlined,
} from "@ant-design/icons";
import type { TeacherScopeAnalysis, SkillGap } from "@/models/analyse/analyticsFeature";

const URGENCE_COLOR: Record<string, string> = {
  CRITIQUE: "#ef4444",
  HAUTE: "#f97316",
  MODEREE: "#f59e0b",
  FAIBLE: "#10b981",
};

function urgenceColor(v: number): string {
  if (v >= 0.75) return "CRITIQUE";
  if (v >= 0.5) return "HAUTE";
  if (v >= 0.25) return "MODEREE";
  return "FAIBLE";
}

interface Props {
  readonly data: TeacherScopeAnalysis | undefined;
  readonly loading: boolean;
}

/**
 * Panneau "Analyse contextuelle par spécialité / UP / département".
 * Monte : bloc contexte (grade, specialite, UP, dept) + resultats filtres
 * (gaps + recommandations sur les competences du perimetre) + indicateurs ML.
 */
export default function TeacherScopePanel({ data, loading }: Readonly<Props>) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: "var(--at-ink3)" }}>
          Chargement de l'analyse contextuelle...
        </div>
      </div>
    );
  }
  if (!data) return <Empty description="Aucune analyse disponible" />;

  const c = data.context;
  const scopeCoverage = data.total_competencies_count > 0
    ? Math.round((data.scoped_competencies_count / data.total_competencies_count) * 100)
    : 0;

  return (
    <div className="at-scope-root">
      {/* ── Bloc contexte ──────────────────────────────────────────────── */}
      <div className="at-scope-context">
        <div className="at-scope-row">
          <UserOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Enseignant</div>
            <div className="at-scope-value">{c.nom_complet}</div>
            <div className="at-scope-sub">{c.mail}</div>
          </div>
        </div>
        <div className="at-scope-row">
          <BookOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Spécialité</div>
            <div className="at-scope-value">{c.specialite ?? "Non renseignée"}</div>
            {c.grade ? <div className="at-scope-sub">Grade : {c.grade}</div> : null}
          </div>
        </div>
        <div className="at-scope-row">
          <ApartmentOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Département / Unité pédagogique</div>
            <div className="at-scope-value">{c.dept_libelle ?? "—"}</div>
            <div className="at-scope-sub">{c.up_libelle ?? "—"}</div>
          </div>
        </div>
        <div className="at-scope-row">
          <AimOutlined className="at-scope-icon" />
          <div>
            <div className="at-scope-label">Périmètre analysé</div>
            <div className="at-scope-value">
              {data.scoped_competencies_count} / {data.total_competencies_count} compétences
            </div>
            <Progress
              percent={scopeCoverage}
              size="small"
              showInfo={false}
              strokeColor={data.is_fallback_global ? "#f59e0b" : "#10b981"}
              style={{ marginTop: 4 }}
            />
            {data.is_fallback_global && (
              <Tooltip title="Aucun domaine rattache a la specialite/UP/dept — fallback sur le referentiel global">
                <Tag color="warning" icon={<AlertOutlined />} style={{ marginTop: 6 }}>
                  Référentiel global (périmètre vide)
                </Tag>
              </Tooltip>
            )}
            {!data.is_fallback_global && (
              <Tag color="success" icon={<CheckCircleFilled />} style={{ marginTop: 6 }}>
                Périmètre ciblé
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* ── Gaps ──────────────────────────────────────────────────────── */}
      <div className="at-scope-section">
        <div className="at-scope-section-head">
          <AlertOutlined /> Gaps sur le périmètre ({data.gaps.length})
        </div>
        {data.gaps.length === 0 ? (
          <Empty description="Aucun gap sur le périmètre" />
        ) : (
          <Table<SkillGap>
            size="small"
            rowKey={(g) => `gap-${g.competence_id}`}
            pagination={false}
            dataSource={data.gaps}
            columns={[
              {
                title: "Compétence",
                dataIndex: "competence_nom",
                key: "nom",
                render: (nom: string, g) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{nom}</div>
                    <div style={{ fontSize: 11, color: "var(--at-ink3)" }}>{g.competence_code}</div>
                  </div>
                ),
              },
              {
                title: "Niveau",
                key: "niveau",
                width: 110,
                render: (_, g) => `${g.niveau_actuel.toFixed(1)} / ${g.niveau_requis}`,
              },
              {
                title: "Gap",
                dataIndex: "gap_score",
                key: "gap",
                width: 90,
                render: (v: number) => (
                  <span style={{ fontWeight: 600, color: URGENCE_COLOR[urgenceColor(v)] }}>
                    {Math.round(v * 100)}%
                  </span>
                ),
              },
              {
                title: "Urgence",
                dataIndex: "niveau_urgence",
                key: "urgence",
                width: 90,
                render: (u: string) => (
                  <Tag color={URGENCE_COLOR[u]}>{u}</Tag>
                ),
              },
              {
                title: "Tendance",
                dataIndex: "en_regression",
                key: "trend",
                width: 90,
                render: (decl: boolean) =>
                  decl ? <Tag color="error">Régression</Tag> : <Tag>Stable</Tag>,
              },
            ]}
          />
        )}
      </div>

      {/* ── Recommandations ────────────────────────────────────────────── */}
      <div className="at-scope-section">
        <div className="at-scope-section-head">
          <ThunderboltOutlined /> Formations ciblées ({data.recommendations.length})
        </div>
        {data.recommendations.length === 0 ? (
          <Empty description="Aucune recommandation pour ce périmètre" />
        ) : (
          <div className="at-scope-reco">
            {data.recommendations.map((r) => (
              <div key={`rec-${r.formation_id}-${r.competence_id}`} className="at-scope-reco-card">
                <div className="at-scope-reco-head">
                  <span className="at-scope-reco-title">{r.formation_titre}</span>
                  <Tag color="blue">Score {Math.round((r.score_global ?? 0) * 100)}</Tag>
                </div>
                {r.justification ? (
                  <div className="at-scope-reco-justif">{r.justification}</div>
                ) : null}
                {r.competence_nom ? (
                  <div className="at-scope-reco-comp">Cible : {r.competence_nom}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
